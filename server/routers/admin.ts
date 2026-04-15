import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  clients,
  employees,
  scheduleOccurrences,
  users,
  workSchedules,
} from "../../drizzle/schema";
import {
  OCCURRENCE_TYPES,
  getOccurrenceTypeLabel,
} from "../lib/schedule-occurrences";
import { TRPCError } from "@trpc/server";

export const adminRouter = router({
  getOccurrencesReport: adminProcedure
    .input(
      z
        .object({
          dateStart: z.string().optional(),
          dateEnd: z.string().optional(),
          clientId: z.number().optional(),
          leaderId: z.number().optional(),
          type: z.array(z.enum(OCCURRENCE_TYPES)).optional(),
          resolved: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          occurrences: [],
          chart: [],
        };
      }

      const conditions = [];
      if (input?.dateStart) {
        conditions.push(gte(scheduleOccurrences.createdAt, new Date(input.dateStart)));
      }
      if (input?.dateEnd) {
        conditions.push(lte(scheduleOccurrences.createdAt, new Date(input.dateEnd)));
      }
      if (input?.type?.length === 1) {
        conditions.push(eq(scheduleOccurrences.type, input.type[0]));
      }
      if (typeof input?.resolved === "boolean") {
        conditions.push(eq(scheduleOccurrences.resolved, input.resolved));
      }

      const occurrences = await db
        .select()
        .from(scheduleOccurrences)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(scheduleOccurrences.createdAt));

      const scheduleIds = Array.from(new Set(occurrences.map(item => item.scheduleId)));
      const employeeIds = Array.from(
        new Set(
          occurrences
            .map(item => item.employeeId)
            .filter((id): id is number => typeof id === "number")
        )
      );
      const createdByIds = Array.from(
        new Set(
          occurrences
            .map(item => item.createdBy)
            .filter((id): id is number => typeof id === "number")
        )
      );

      const [schedules, occurrenceEmployees, creators] = await Promise.all([
        scheduleIds.length > 0
          ? db.select().from(workSchedules).where(inArray(workSchedules.id, scheduleIds))
          : Promise.resolve([]),
        employeeIds.length > 0
          ? db.select().from(employees).where(inArray(employees.id, employeeIds))
          : Promise.resolve([]),
        createdByIds.length > 0
          ? db.select().from(users).where(inArray(users.id, createdByIds))
          : Promise.resolve([]),
      ]);

      const filteredSchedules = schedules.filter(schedule => {
        if (input?.clientId && schedule.clientId !== input.clientId) return false;
        if (input?.leaderId && schedule.leaderId !== input.leaderId) return false;
        return true;
      });

      const allowedScheduleIds = new Set(filteredSchedules.map(item => item.id));
      const filteredOccurrences = occurrences.filter(item => {
        if (!allowedScheduleIds.has(item.scheduleId)) return false;
        if (input?.type?.length && !input.type.includes(item.type)) return false;
        return true;
      });

      const clientIds = Array.from(new Set(filteredSchedules.map(item => item.clientId)));
      const leaderIds = Array.from(
        new Set(
          filteredSchedules
            .map(item => item.leaderId)
            .filter((id): id is number => typeof id === "number")
        )
      );
      const [relatedClients, leaders] = await Promise.all([
        clientIds.length > 0
          ? db.select().from(clients).where(inArray(clients.id, clientIds))
          : Promise.resolve([]),
        leaderIds.length > 0
          ? db.select().from(employees).where(inArray(employees.id, leaderIds))
          : Promise.resolve([]),
      ]);

      const scheduleMap = Object.fromEntries(filteredSchedules.map(item => [item.id, item]));
      const clientMap = Object.fromEntries(relatedClients.map(item => [item.id, item]));
      const employeeMap = Object.fromEntries(occurrenceEmployees.map(item => [item.id, item]));
      const leaderMap = Object.fromEntries(leaders.map(item => [item.id, item]));
      const creatorMap = Object.fromEntries(creators.map(item => [item.id, item]));

      const chartCounts = new Map<string, number>();
      for (const occurrence of filteredOccurrences) {
        const type = occurrence.type;
        chartCounts.set(type, (chartCounts.get(type) || 0) + 1);
      }

      return {
        occurrences: filteredOccurrences.map(item => {
          const schedule = scheduleMap[item.scheduleId];
          return {
            ...item,
            typeLabel: getOccurrenceTypeLabel(item.type),
            employeeName: item.employeeId ? employeeMap[item.employeeId]?.name || "—" : "Operação",
            clientName: schedule ? clientMap[schedule.clientId]?.name || "—" : "—",
            leaderName:
              schedule?.leaderId ? leaderMap[schedule.leaderId]?.name || "—" : "—",
            createdByName:
              typeof item.createdBy === "number"
                ? creatorMap[item.createdBy]?.name || "Sistema"
                : "Sistema",
            scheduleDate: schedule?.date || null,
          };
        }),
        chart: Array.from(chartCounts.entries()).map(([type, count]) => ({
          type,
          typeLabel: getOccurrenceTypeLabel(type as (typeof OCCURRENCE_TYPES)[number]),
          count,
        })),
        stats: {
          total: filteredOccurrences.length,
          unresolved: filteredOccurrences.filter(item => !item.resolved).length,
          resolved: filteredOccurrences.filter(item => item.resolved).length,
        },
      };
    }),

  resolveOccurrence: adminProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(scheduleOccurrences)
        .set({ resolved: true })
        .where(eq(scheduleOccurrences.id, input));

      return { success: true };
    }),
});
