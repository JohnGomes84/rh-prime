import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { desc, eq, and, inArray, gte, lte } from "drizzle-orm";
import { getDb } from "../../db";
import {
  workSchedules,
  scheduleAllocations,
  employees,
  clients,
  shifts,
  clientUnits,
  scheduleOccurrences,
} from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { getOccurrenceSeverity } from "../../lib/schedule-occurrences";
import { isLeaderOfSchedule } from "./_shared";
import type { PortalUserContext, LeaderScheduleSummary } from "./_shared";

import type { scheduleOccurrences as _occ } from "../../../drizzle/schema";
type OccurrenceRow = typeof _occ.$inferSelect;

async function loadLeaderSchedules(
  ctx: PortalUserContext,
  input?: { dateStart?: string; dateEnd?: string }
): Promise<LeaderScheduleSummary[]> {
  const db = await getDb();
  if (!db) return [];
  if (!ctx.user.email && ctx.user.role !== "admin") return [];

  const [myEmp] = ctx.user.email
    ? await db.select().from(employees).where(eq(employees.email, ctx.user.email)).limit(1)
    : [];

  if (!myEmp && ctx.user.role !== "admin") return [];

  let dateStart = input?.dateStart;
  let dateEnd = input?.dateEnd;

  if (!dateStart && !dateEnd) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    dateStart = today.toISOString();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    dateEnd = tomorrow.toISOString();
  }

  const dateConditions = [];
  if (dateStart) dateConditions.push(gte(workSchedules.date, new Date(dateStart)));
  if (dateEnd) {
    const de = new Date(dateEnd);
    de.setUTCHours(23, 59, 59, 999);
    dateConditions.push(lte(workSchedules.date, de));
  }

  const leaderCondition = ctx.user.role !== "admin" ? eq(workSchedules.leaderId, myEmp!.id) : undefined;
  const whereClause = and(...dateConditions, leaderCondition);

  const filteredSchedules = await db.select().from(workSchedules).where(whereClause);

  const scheduleIds = filteredSchedules.map(s => s.id);
  const [allClients, allShifts, allUnits, allocations, unresolvedOccurrences] = await Promise.all([
    db.select().from(clients),
    db.select().from(shifts),
    db.select().from(clientUnits),
    scheduleIds.length > 0
      ? db.select().from(scheduleAllocations).where(inArray(scheduleAllocations.scheduleId, scheduleIds))
      : Promise.resolve([]),
    scheduleIds.length > 0
      ? db.select().from(scheduleOccurrences).where(and(inArray(scheduleOccurrences.scheduleId, scheduleIds), eq(scheduleOccurrences.resolved, false)))
      : Promise.resolve([]),
  ]);

  const clientMap = Object.fromEntries(allClients.map(c => [c.id, c]));
  const shiftMap = Object.fromEntries(allShifts.map(s => [s.id, s]));
  const unitMap = Object.fromEntries(allUnits.map(u => [u.id, u]));
  const allocationsCountMap = allocations.reduce<Record<number, number>>((acc, a) => {
    acc[a.scheduleId] = (acc[a.scheduleId] || 0) + 1;
    return acc;
  }, {});
  const occurrencesCountMap = unresolvedOccurrences.reduce<Record<number, number>>((acc, o) => {
    acc[o.scheduleId] = (acc[o.scheduleId] || 0) + 1;
    return acc;
  }, {});

  return filteredSchedules.map(schedule => ({
    ...schedule,
    clientName: clientMap[schedule.clientId]?.name || "—",
    shiftName: schedule.shiftId ? shiftMap[schedule.shiftId]?.name || "—" : "—",
    unitName: schedule.clientUnitId ? unitMap[schedule.clientUnitId]?.name || "—" : "—",
    allocationsCount: allocationsCountMap[schedule.id] || 0,
    occurrencesCount: occurrencesCountMap[schedule.id] || 0,
  }));
}

export const schedulesPortalRouter = router({
  operationFormOptions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { clients: [], shifts: [] };
    if (!ctx.user.email && ctx.user.role !== "admin") return { clients: [], shifts: [] };

    const [allClients, allShifts] = await Promise.all([
      db.select().from(clients),
      db.select().from(shifts),
    ]);
    return { clients: allClients, shifts: allShifts };
  }),

  unitsByClient: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(clientUnits).where(and(eq(clientUnits.clientId, input), eq(clientUnits.isActive, true)));
    }),

  createOperation: protectedProcedure
    .input(z.object({
      date: z.string(),
      shiftId: z.number().optional(),
      clientId: z.number(),
      clientUnitId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!ctx.user.email && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const [myEmp] = ctx.user.email
        ? await db.select().from(employees).where(eq(employees.email, ctx.user.email)).limit(1)
        : [];

      if (!myEmp && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao e o lider deste planejamento" });
      }

      const targetDate = new Date(input.date);
      targetDate.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      const existing = await db.select().from(workSchedules).where(
        and(
          eq(workSchedules.clientId, input.clientId),
          gte(workSchedules.date, targetDate),
          lte(workSchedules.date, nextDay),
        )
      );

      const duplicate = existing.find(s =>
        (s.shiftId ?? null) === (input.shiftId ?? null) &&
        (s.clientUnitId ?? null) === (input.clientUnitId ?? null)
      );

      if (duplicate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ja existe operacao para este cliente, turno e local nesta data" });
      }

      const result = await db.insert(workSchedules).values({
        date: new Date(input.date),
        shiftId: input.shiftId ?? null,
        clientId: input.clientId,
        clientUnitId: input.clientUnitId ?? null,
        leaderId: myEmp?.id ?? null,
        status: "pendente",
        notes: input.notes ?? null,
      });

      return { id: Number(result[0].insertId) };
    }),

  myScheduleCards: protectedProcedure
    .input(z.object({ dateStart: z.string().optional(), dateEnd: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const baseSchedules = await loadLeaderSchedules(ctx, input);

      const db = await getDb();
      if (!db) return [];

      const clientIds = Array.from(new Set(baseSchedules.map(s => s.clientId)));
      const shiftIds = Array.from(new Set(baseSchedules.map(s => s.shiftId).filter((id): id is number => typeof id === "number")));
      const unitIds = Array.from(new Set(baseSchedules.map(s => s.clientUnitId).filter((id): id is number => typeof id === "number")));
      const scheduleIds = baseSchedules.map(s => s.id);

      const [allClients, allShifts, allUnits, allAllocations, unresolvedOccurrences] = await Promise.all([
        clientIds.length > 0 ? db.select().from(clients).where(inArray(clients.id, clientIds)) : Promise.resolve([]),
        shiftIds.length > 0 ? db.select().from(shifts).where(inArray(shifts.id, shiftIds)) : Promise.resolve([]),
        unitIds.length > 0 ? db.select().from(clientUnits).where(inArray(clientUnits.id, unitIds)) : Promise.resolve([]),
        scheduleIds.length > 0 ? db.select().from(scheduleAllocations).where(inArray(scheduleAllocations.scheduleId, scheduleIds)) : Promise.resolve([]),
        scheduleIds.length > 0
          ? db.select().from(scheduleOccurrences).where(and(inArray(scheduleOccurrences.scheduleId, scheduleIds), eq(scheduleOccurrences.resolved, false)))
          : Promise.resolve([]),
      ]);

      const clientMap = Object.fromEntries(allClients.map(c => [c.id, c]));
      const shiftMap = Object.fromEntries(allShifts.map(s => [s.id, s]));
      const unitMap = Object.fromEntries(allUnits.map(u => [u.id, u]));
      const allocationsCountMap = allAllocations.reduce<Record<number, number>>((acc, a) => {
        acc[a.scheduleId] = (acc[a.scheduleId] || 0) + 1;
        return acc;
      }, {});
      const occurrencesBySchedule = unresolvedOccurrences.reduce<Record<number, OccurrenceRow[]>>((acc, o) => {
        if (!acc[o.scheduleId]) acc[o.scheduleId] = [];
        acc[o.scheduleId].push(o);
        return acc;
      }, {});

      return baseSchedules.map(schedule => ({
        id: schedule.id,
        date: schedule.date,
        status: schedule.status,
        clientName: clientMap[schedule.clientId]?.name || "—",
        unitName: schedule.clientUnitId ? unitMap[schedule.clientUnitId]?.name || "—" : "—",
        shiftName: schedule.shiftId ? shiftMap[schedule.shiftId]?.name || "—" : "—",
        allocationsCount: allocationsCountMap[schedule.id] || 0,
        occurrencesCount: (occurrencesBySchedule[schedule.id] || []).length,
        unresolvedOccurrencesCount: (occurrencesBySchedule[schedule.id] || []).length,
        occurrenceSeverity: getOccurrenceSeverity(occurrencesBySchedule[schedule.id] || []),
        occurrenceTooltip: `${(occurrencesBySchedule[schedule.id] || []).length} ocorrências não resolvidas`,
      }));
    }),

  mySchedules: protectedProcedure
    .input(z.object({ dateStart: z.string().optional(), dateEnd: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return loadLeaderSchedules(ctx, input);
    }),

  getScheduleDetail: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao e o lider deste planejamento" });

      const db = await getDb();
      if (!db) return null;

      const [schedule] = await db.select().from(workSchedules).where(eq(workSchedules.id, input)).limit(1);
      if (!schedule) return null;

      const [clientData] = await db.select().from(clients).where(eq(clients.id, schedule.clientId)).limit(1);
      const [shiftData] = schedule.shiftId
        ? await db.select().from(shifts).where(eq(shifts.id, schedule.shiftId)).limit(1)
        : [null];
      const [unitData] = schedule.clientUnitId
        ? await db.select().from(clientUnits).where(eq(clientUnits.id, schedule.clientUnitId)).limit(1)
        : [null];

      const occurrences = await db.select().from(scheduleOccurrences).where(eq(scheduleOccurrences.scheduleId, input)).orderBy(desc(scheduleOccurrences.createdAt));
      const allocs = await db.select().from(scheduleAllocations).where(eq(scheduleAllocations.scheduleId, input));

      const empIds = Array.from(new Set(allocs.map(a => a.employeeId)));
      const empMap: Record<number, typeof employees.$inferSelect> = {};
      if (empIds.length > 0) {
        const emps = await db.select().from(employees).where(inArray(employees.id, empIds));
        emps.forEach(e => { empMap[e.id] = e; });
      }

      return {
        ...schedule,
        clientName: clientData?.name || "—",
        shiftName: shiftData?.name || "-",
        shiftTime: shiftData ? `${shiftData.startTime || ""} - ${shiftData.endTime || ""}` : "",
        unitName: unitData?.name || "-",
        allocations: allocs.map(a => ({
          ...a,
          employeeName: empMap[a.employeeId]?.name || "—",
          employeeCpf: empMap[a.employeeId]?.cpf || "",
          employeePixKey: empMap[a.employeeId]?.pixKey || "",
        })),
        occurrences,
      };
    }),
});
