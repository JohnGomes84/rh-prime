import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { desc, eq, and, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  workSchedules,
  scheduleAllocations,
  scheduleFunctions,
  employees,
  pixChangeRequests,
  users,
  clients,
  shifts,
  clientUnits,
  jobFunctions,
  scheduleOccurrences,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { notifyPixRequestCreated, notifyPixRequestReviewed } from "../lib/sse-notifications";
import {
  OCCURRENCE_TYPES,
  buildShiftWindow,
  createAutomaticOccurrenceIfNeeded,
  getOccurrenceSeverity,
  getOccurrenceTypeLabel,
  getShiftDurationHours,
} from "../lib/schedule-occurrences";

type PortalUserContext = {
  user: {
    id: number;
    role: string;
    email?: string | null;
  };
};

type ScheduleRow = typeof workSchedules.$inferSelect;
type OccurrenceRow = typeof scheduleOccurrences.$inferSelect;

type LeaderScheduleSummary = ScheduleRow & {
  clientName: string;
  shiftName: string;
  unitName: string;
  allocationsCount: number;
  occurrencesCount: number;
};

// Helper: verificar se usuário é líder de um planejamento
async function isLeaderOfSchedule(
  userId: number,
  scheduleId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Buscar o planejamento
  const [schedule] = await db
    .select()
    .from(workSchedules)
    .where(eq(workSchedules.id, scheduleId))
    .limit(1);
  if (!schedule) return false;

  // Admins podem ver tudo
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (user?.role === "admin") return true;

  if (!schedule.leaderId) return false;

  // Buscar o funcionário do líder
  const [leaderEmp] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, schedule.leaderId))
    .limit(1);
  if (!leaderEmp) return false;

  // Verificar se o usuário logado é o funcionário líder (por email)
  return user?.email === leaderEmp.email || false;
}

async function getScheduleWithShift(scheduleId: number) {
  const db = await getDb();
  if (!db) return { schedule: null, shift: null };

  const [schedule] = await db
    .select()
    .from(workSchedules)
    .where(eq(workSchedules.id, scheduleId))
    .limit(1);

  if (!schedule || !schedule.shiftId) {
    return { schedule: schedule || null, shift: null };
  }

  const [shift] = await db
    .select()
    .from(shifts)
    .where(eq(shifts.id, schedule.shiftId))
    .limit(1);

  return { schedule, shift: shift || null };
}

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

  const schedules = ctx.user.role === "admin"
    ? await db.select().from(workSchedules)
    : await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.leaderId, myEmp!.id));

  let filteredSchedules = schedules;
  let dateStart = input?.dateStart;
  let dateEnd = input?.dateEnd;

  if (!dateStart && !dateEnd) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateStart = today.toISOString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateEnd = tomorrow.toISOString();
  }

  if (dateStart) {
    const ds = new Date(dateStart);
    filteredSchedules = filteredSchedules.filter(schedule => new Date(schedule.date) >= ds);
  }

  if (dateEnd) {
    const de = new Date(dateEnd);
    de.setHours(23, 59, 59, 999);
    filteredSchedules = filteredSchedules.filter(schedule => new Date(schedule.date) <= de);
  }

  const scheduleIds = filteredSchedules.map(schedule => schedule.id);
  const [allClients, allShifts, allUnits, allocations, unresolvedOccurrences] = await Promise.all([
    db.select().from(clients),
    db.select().from(shifts),
    db.select().from(clientUnits),
    scheduleIds.length > 0
      ? db.select().from(scheduleAllocations).where(inArray(scheduleAllocations.scheduleId, scheduleIds))
      : Promise.resolve([]),
    scheduleIds.length > 0
      ? db
          .select()
          .from(scheduleOccurrences)
          .where(
            and(
              inArray(scheduleOccurrences.scheduleId, scheduleIds),
              eq(scheduleOccurrences.resolved, false)
            )
          )
      : Promise.resolve([]),
  ]);

  const clientMap = Object.fromEntries(allClients.map(item => [item.id, item]));
  const shiftMap = Object.fromEntries(allShifts.map(item => [item.id, item]));
  const unitMap = Object.fromEntries(allUnits.map(item => [item.id, item]));
  const allocationsCountMap = allocations.reduce<Record<number, number>>((acc, allocation) => {
    acc[allocation.scheduleId] = (acc[allocation.scheduleId] || 0) + 1;
    return acc;
  }, {});
  const occurrencesCountMap = unresolvedOccurrences.reduce<Record<number, number>>(
    (acc, occurrence) => {
      acc[occurrence.scheduleId] = (acc[occurrence.scheduleId] || 0) + 1;
      return acc;
    },
    {}
  );

  return filteredSchedules.map(schedule => ({
    ...schedule,
    clientName: clientMap[schedule.clientId]?.name || "—",
    shiftName: schedule.shiftId ? shiftMap[schedule.shiftId]?.name || "—" : "—",
    unitName: schedule.clientUnitId ? unitMap[schedule.clientUnitId]?.name || "—" : "—",
    allocationsCount: allocationsCountMap[schedule.id] || 0,
    occurrencesCount: occurrencesCountMap[schedule.id] || 0,
  }));
}

export const portalLiderRouter = router({
  operationFormOptions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { clients: [], shifts: [] };
    if (!ctx.user.email && ctx.user.role !== "admin") {
      return { clients: [], shifts: [] };
    }

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

      return db
        .select()
        .from(clientUnits)
        .where(and(eq(clientUnits.clientId, input), eq(clientUnits.isActive, true)));
    }),

  createOperation: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        shiftId: z.number().optional(),
        clientId: z.number(),
        clientUnitId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!ctx.user.email && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [myEmp] = ctx.user.email
        ? await db
            .select()
            .from(employees)
            .where(eq(employees.email, ctx.user.email))
            .limit(1)
        : [];


      if (!myEmp && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce nao e o lider deste planejamento",
        });
      }

      const schedulesForClient = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.clientId, input.clientId));

      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);

      const duplicate = schedulesForClient.find(schedule => {
        const scheduleDate = new Date(schedule.date);
        scheduleDate.setHours(0, 0, 0, 0);
        return (
          scheduleDate.getTime() === targetDate.getTime() &&
          (schedule.shiftId ?? null) === (input.shiftId ?? null) &&
          (schedule.clientUnitId ?? null) === (input.clientUnitId ?? null)
        );
      });

      if (duplicate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ja existe operacao para este cliente, turno e local nesta data",
        });
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
    .input(
      z
        .object({
          dateStart: z.string().optional(),
          dateEnd: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const baseSchedules = await loadLeaderSchedules(ctx, input);

      const db = await getDb();
      if (!db) return [];

      const clientIds: number[] = Array.from(
        new Set(baseSchedules.map(schedule => schedule.clientId))
      );
      const shiftIds: number[] = Array.from(
        new Set(
          baseSchedules
            .map(schedule => schedule.shiftId)
            .filter((id): id is number => typeof id === "number")
        )
      );
      const unitIds: number[] = Array.from(
        new Set(
          baseSchedules
            .map(schedule => schedule.clientUnitId)
            .filter((id): id is number => typeof id === "number")
        )
      );
      const scheduleIds: number[] = baseSchedules.map(schedule => schedule.id);

      const [allClients, allShifts, allUnits, allAllocations, unresolvedOccurrences] = await Promise.all([
        clientIds.length > 0
          ? db.select().from(clients).where(inArray(clients.id, clientIds))
          : Promise.resolve([]),
        shiftIds.length > 0
          ? db.select().from(shifts).where(inArray(shifts.id, shiftIds))
          : Promise.resolve([]),
        unitIds.length > 0
          ? db.select().from(clientUnits).where(inArray(clientUnits.id, unitIds))
          : Promise.resolve([]),
        scheduleIds.length > 0
          ? db
              .select()
              .from(scheduleAllocations)
              .where(inArray(scheduleAllocations.scheduleId, scheduleIds))
          : Promise.resolve([]),
        scheduleIds.length > 0
          ? db
              .select()
              .from(scheduleOccurrences)
              .where(
                and(
                  inArray(scheduleOccurrences.scheduleId, scheduleIds),
                  eq(scheduleOccurrences.resolved, false)
                )
              )
          : Promise.resolve([]),
      ]);

      const clientMap = Object.fromEntries(allClients.map(item => [item.id, item]));
      const shiftMap = Object.fromEntries(allShifts.map(item => [item.id, item]));
      const unitMap = Object.fromEntries(allUnits.map(item => [item.id, item]));
      const allocationsCountMap = allAllocations.reduce<Record<number, number>>(
        (acc, allocation) => {
          acc[allocation.scheduleId] = (acc[allocation.scheduleId] || 0) + 1;
          return acc;
        },
        {}
      );
      const occurrencesBySchedule = unresolvedOccurrences.reduce<Record<number, OccurrenceRow[]>>((acc, occurrence) => {
        if (!acc[occurrence.scheduleId]) {
          acc[occurrence.scheduleId] = [];
        }
        acc[occurrence.scheduleId].push(occurrence);
        return acc;
      }, {});

      return baseSchedules.map(schedule => ({
        id: schedule.id,
        date: schedule.date,
        status: schedule.status,
        clientName: clientMap[schedule.clientId]?.name || "—",
        unitName: schedule.clientUnitId
          ? unitMap[schedule.clientUnitId]?.name || "—"
          : "—",
        shiftName: schedule.shiftId
          ? shiftMap[schedule.shiftId]?.name || "—"
          : "—",
        allocationsCount: allocationsCountMap[schedule.id] || 0,
        occurrencesCount: (occurrencesBySchedule[schedule.id] || []).length,
        unresolvedOccurrencesCount:
          (occurrencesBySchedule[schedule.id] || []).length,
        occurrenceSeverity: getOccurrenceSeverity(
          occurrencesBySchedule[schedule.id] || []
        ),
        occurrenceTooltip: `${(occurrencesBySchedule[schedule.id] || []).length} ocorrências não resolvidas`,
      }));
    }),
  // ============ MEUS PLANEJAMENTOS (filtrado por líder) ============
  mySchedules: protectedProcedure
    .input(
      z
        .object({
          dateStart: z.string().optional(),
          dateEnd: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return loadLeaderSchedules(ctx, input);
    }),


  // ============ DETALHES DE UM PLANEJAMENTO (com alocações) ============
  getScheduleDetail: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce nao e o lider deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) return null;

      const [schedule] = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.id, input))
        .limit(1);
      if (!schedule) return null;

      const [clientData] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, schedule.clientId))
        .limit(1);
      const [shiftData] = schedule.shiftId
        ? await db
            .select()
            .from(shifts)
            .where(eq(shifts.id, schedule.shiftId))
            .limit(1)
        : [null];
      const [unitData] = schedule.clientUnitId
        ? await db
            .select()
            .from(clientUnits)
            .where(eq(clientUnits.id, schedule.clientUnitId))
            .limit(1)
        : [null];
      const occurrences = await db
        .select()
        .from(scheduleOccurrences)
        .where(eq(scheduleOccurrences.scheduleId, input))
        .orderBy(desc(scheduleOccurrences.createdAt));

      // Buscar alocações
      const allocs = await db
        .select()
        .from(scheduleAllocations)
        .where(eq(scheduleAllocations.scheduleId, input));

      // Buscar dados dos funcionários alocados
      const empIds = Array.from(new Set(allocs.map(a => a.employeeId)));
      const empMap: Record<number, any> = {};
      if (empIds.length > 0) {
        const emps = await db
          .select()
          .from(employees)
          .where(inArray(employees.id, empIds));
        emps.forEach(e => {
          empMap[e.id] = e;
        });
      }

      return {
        ...schedule,
        clientName: clientData?.name || "—",
        shiftName: shiftData?.name || "-",
        shiftTime: shiftData
          ? `${shiftData.startTime || ""} - ${shiftData.endTime || ""}`
          : "",
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

  listOccurrences: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) return [];

      const occurrences = await db
        .select()
        .from(scheduleOccurrences)
        .where(eq(scheduleOccurrences.scheduleId, input))
        .orderBy(desc(scheduleOccurrences.createdAt));

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

      const [employeesList, usersList] = await Promise.all([
        employeeIds.length > 0
          ? db.select().from(employees).where(inArray(employees.id, employeeIds))
          : Promise.resolve([]),
        createdByIds.length > 0
          ? db.select().from(users).where(inArray(users.id, createdByIds))
          : Promise.resolve([]),
      ]);

      const employeeMap = Object.fromEntries(
        employeesList.map(item => [item.id, item])
      );
      const userMap = Object.fromEntries(usersList.map(item => [item.id, item]));

      return occurrences.map(item => ({
        ...item,
        employeeName: item.employeeId ? employeeMap[item.employeeId]?.name || "—" : "Operação",
        createdByName:
          typeof item.createdBy === "number"
            ? userMap[item.createdBy]?.name || "Sistema"
            : "Sistema",
        typeLabel: getOccurrenceTypeLabel(item.type),
      }));
    }),

  addOccurrence: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        employeeId: z.number().optional(),
        type: z.enum(OCCURRENCE_TYPES),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce nao e o lider deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(scheduleOccurrences).values({
        scheduleId: input.scheduleId,
        employeeId: input.employeeId ?? null,
        type: input.type,
        description: input.description?.trim() || null,
        autoGenerated: false,
        resolved: false,
        createdBy: ctx.user.id,
      });

      return { id: Number(result.insertId), success: true };
    }),

  updateOccurrence: protectedProcedure
    .input(
      z.object({
        occurrenceId: z.number(),
        scheduleId: z.number(),
        employeeId: z.number().optional(),
        type: z.enum(OCCURRENCE_TYPES),
        description: z.string().min(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(scheduleOccurrences)
        .set({
          employeeId: input.employeeId ?? null,
          type: input.type,
          description: input.description.trim(),
        })
        .where(
          and(
            eq(scheduleOccurrences.id, input.occurrenceId),
            eq(scheduleOccurrences.scheduleId, input.scheduleId)
          )
        );

      return { success: true };
    }),

  deleteOccurrence: protectedProcedure
    .input(
      z.object({
        occurrenceId: z.number(),
        scheduleId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .delete(scheduleOccurrences)
        .where(
          and(
            eq(scheduleOccurrences.id, input.occurrenceId),
            eq(scheduleOccurrences.scheduleId, input.scheduleId)
          )
        );

      return { success: true };
    }),

  resolveOccurrence: protectedProcedure
    .input(
      z.object({
        occurrenceId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [occurrence] = await db
        .select()
        .from(scheduleOccurrences)
        .where(eq(scheduleOccurrences.id, input.occurrenceId))
        .limit(1);
      if (!occurrence) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ocorrencia nao encontrada",
        });
      }
      const isLeader = await isLeaderOfSchedule(ctx.user.id, occurrence.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste planejamento",
        });
      }
      await db
        .update(scheduleOccurrences)
        .set({ resolved: true })
        .where(eq(scheduleOccurrences.id, input.occurrenceId));

      return { success: true };
    }),

  resolveAllOccurrences: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(scheduleOccurrences)
        .set({ resolved: true })
        .where(
          and(
            eq(scheduleOccurrences.scheduleId, input),
            eq(scheduleOccurrences.resolved, false)
          )
        );

      return { success: true };
    }),

  // ============ CHECK-IN ============
  checkIn: protectedProcedure
    .input(z.object({ allocationId: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();

      const [allocation] = await db
        .select()
        .from(scheduleAllocations)
        .where(eq(scheduleAllocations.id, input.allocationId))
        .limit(1);
      if (!allocation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alocação não encontrada",
        });
      }

      await db
        .update(scheduleAllocations)
        .set({
          checkInTime: now,
        })
        .where(eq(scheduleAllocations.id, input.allocationId));

      const { schedule, shift } = await getScheduleWithShift(input.scheduleId);
      if (schedule && allocation.employeeId) {
        const { start } = buildShiftWindow(new Date(schedule.date), shift);
        const diffMinutes = (now.getTime() - start.getTime()) / (1000 * 60);
        if (diffMinutes > 15) {
          await createAutomaticOccurrenceIfNeeded({
            db,
            scheduleId: input.scheduleId,
            employeeId: allocation.employeeId,
            type: "late",
            description: "Atraso no check-in",
            createdBy: ctx.user.id,
          });
        }
      }

      return { success: true };
    }),

  // ============ CHECK-OUT ============
  checkOut: protectedProcedure
    .input(z.object({ allocationId: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();

      const [allocation] = await db
        .select()
        .from(scheduleAllocations)
        .where(eq(scheduleAllocations.id, input.allocationId))
        .limit(1);
      if (!allocation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alocação não encontrada",
        });
      }

      await db
        .update(scheduleAllocations)
        .set({
          checkOutTime: now,
        })
        .where(eq(scheduleAllocations.id, input.allocationId));

      const { schedule, shift } = await getScheduleWithShift(input.scheduleId);
      if (schedule && allocation.employeeId) {
        const { end } = buildShiftWindow(new Date(schedule.date), shift);
        const minutesBeforeEnd = (end.getTime() - now.getTime()) / (1000 * 60);
        if (minutesBeforeEnd > 60) {
          await createAutomaticOccurrenceIfNeeded({
            db,
            scheduleId: input.scheduleId,
            employeeId: allocation.employeeId,
            type: "early_exit",
            description: "Saída antecipada",
            createdBy: ctx.user.id,
          });
        }
      }

      return { success: true };
    }),

  // ============ REGISTRAR PRESENÇA (Presente/Faltou/Parcial) ============
  setAttendance: protectedProcedure
    .input(
      z.object({
        allocationId: z.number(),
        scheduleId: z.number(),
        status: z.enum(["presente", "faltou", "parcial"]),
        notes: z.string().optional(),
        partialHours: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar alocação e turno para calcular valor proporcional
      const [alloc] = await db
        .select()
        .from(scheduleAllocations)
        .where(eq(scheduleAllocations.id, input.allocationId))
        .limit(1);
      if (!alloc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alocação não encontrada",
        });
      }

      // Buscar o planejamento para obter o turno
      const [schedule] = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.id, input.scheduleId))
        .limit(1);
      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Planejamento não encontrado",
        });
      }

      const [shiftForAttendance] = schedule.shiftId
        ? await db
            .select()
            .from(shifts)
            .where(eq(shifts.id, schedule.shiftId))
            .limit(1)
        : [null];
      const computedShiftHours = getShiftDurationHours(shiftForAttendance);

      // Buscar turno para calcular horas totais
      let totalShiftHours = 8; // padrão
      if (schedule.shiftId) {
        const [shift] = await db
          .select()
          .from(shifts)
          .where(eq(shifts.id, schedule.shiftId))
          .limit(1);
        if (shift && shift.startTime && shift.endTime) {
          // Calcular diferença em horas
          const start = new Date(`2000-01-01 ${shift.startTime}`);
          const end = new Date(`2000-01-01 ${shift.endTime}`);
          totalShiftHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }
      }

      // Calcular valor proporcional se presença parcial
      let partialPayValue = alloc.payValue;
      if (input.status === "parcial" && input.partialHours) {
        const payValueNum = parseFloat(String(alloc.payValue || 0));
        partialPayValue = ((payValueNum * input.partialHours) / computedShiftHours).toFixed(2);
      }

      await db
        .update(scheduleAllocations)
        .set({
          attendanceStatus: input.status,
          allocNotes: input.notes || null,
          payValue: input.status === "parcial" && input.partialHours ? partialPayValue : alloc.payValue,
        })
        .where(eq(scheduleAllocations.id, input.allocationId));

      if (input.status === "faltou") {
        await createAutomaticOccurrenceIfNeeded({
          db,
          scheduleId: input.scheduleId,
          employeeId: alloc.employeeId,
          type: "absence",
          description: input.notes?.trim() || "Falta registrada pelo líder.",
          createdBy: ctx.user.id,
        });
      }

      if (
        input.status === "parcial" &&
        input.partialHours &&
        input.partialHours < computedShiftHours / 2
      ) {
        await createAutomaticOccurrenceIfNeeded({
          db,
          scheduleId: input.scheduleId,
          employeeId: alloc.employeeId,
          type: "other",
          description: "Meio período não justificado",
          createdBy: ctx.user.id,
        });
      }

      return { success: true };
    }),

  // ============ CADASTRO RÁPIDO DE FUNCIONÁRIO ============
  quickRegisterEmployee: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        cpf: z.string(),
        rg: z.string().optional(),
        pixKey: z.string(),
        pixKeyType: z.enum(["cpf", "email", "phone", "random", "cnpj"]),
        docFrontBase64: z.string().optional(), // Base64 da foto frente
        docBackBase64: z.string().optional(), // Base64 da foto verso
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar se CPF já existe
      const existing = await db
        .select()
        .from(employees)
        .where(eq(employees.cpf, input.cpf))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CPF já cadastrado no sistema",
        });
      }

      // Upload de documentos (se fornecidos)
      let docFrontUrl: string | null = null;
      let docBackUrl: string | null = null;

      if (input.docFrontBase64) {
        try {
          const buffer = Buffer.from(input.docFrontBase64, "base64");
          const result = await storagePut(
            `employees/${input.cpf}/doc-front.jpg`,
            buffer,
            "image/jpeg"
          );
          docFrontUrl = result.url;
        } catch (err) {
          console.error("Erro ao upload documento frente:", err);
        }
      }

      if (input.docBackBase64) {
        try {
          const buffer = Buffer.from(input.docBackBase64, "base64");
          const result = await storagePut(
            `employees/${input.cpf}/doc-back.jpg`,
            buffer,
            "image/jpeg"
          );
          docBackUrl = result.url;
        } catch (err) {
          console.error("Erro ao upload documento verso:", err);
        }
      }

      // Inserir funcionário
      const result = await db.insert(employees).values({
        name: input.name,
        cpf: input.cpf,
        rg: input.rg || null,
        pixKey: input.pixKey,
        pixKeyType: input.pixKeyType,
        docFrontUrl: docFrontUrl || null,
        docBackUrl: docBackUrl || null,
        status: "diarista",
        registrationDate: new Date(),
      });

      return { id: Number(result[0].insertId), name: input.name };
    }),

  // ============ LANCAMENTO RAPIDO DE VALE/BONUS/MARMITA ============
  quickExpense: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        cpf: z.string(),
        type: z.enum(["vale", "bonus", "marmita"]),
        value: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce nao e o lider deste planejamento",
        });
      }

      // Buscar funcionario por CPF
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.cpf, input.cpf))
        .limit(1);
      if (!emp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funcionario nao encontrado",
        });
      }

      // Buscar alocacao do funcionario no planejamento
      const allocs = await db
        .select()
        .from(scheduleAllocations)
        .where(
          and(
            eq(scheduleAllocations.scheduleId, input.scheduleId),
            eq(scheduleAllocations.employeeId, emp.id)
          )
        )
        .limit(1);
      const alloc = allocs[0];
      if (!alloc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funcionario nao esta alocado neste planejamento",
        });
      }

      // Atualizar campo correspondente
      const updateData: any = {};
      if (input.type === "vale") updateData.voucher = input.value;
      else if (input.type === "bonus") updateData.bonus = input.value;
      else if (input.type === "marmita") updateData.mealAllowance = input.value;

      await db
        .update(scheduleAllocations)
        .set(updateData)
        .where(eq(scheduleAllocations.id, alloc.id));

      return { success: true, allocationId: alloc.id };
    }),

  // ============ LISTAR LANCAMENTOS DO DIA ============
  listExpensesForSchedule: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce nao e o lider deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) return [];

      const allocs = await db
        .select()
        .from(scheduleAllocations)
        .where(eq(scheduleAllocations.scheduleId, input));

      // Enriquecer com dados do funcionario
      const empIds = Array.from(new Set(allocs.map(a => a.employeeId)));
      const empMap: Record<number, any> = {};
      if (empIds.length > 0) {
        const emps = await db
          .select()
          .from(employees)
          .where(inArray(employees.id, empIds));
        emps.forEach(e => {
          empMap[e.id] = e;
        });
      }

      return allocs
        .filter(a => a.voucher || a.bonus || a.mealAllowance)
        .map(a => ({
          id: a.id,
          employeeName: empMap[a.employeeId]?.name || "—",
          employeeCpf: empMap[a.employeeId]?.cpf || "",
          voucher: a.voucher,
          bonus: a.bonus,
          mealAllowance: a.mealAllowance,
          total: (parseFloat(String(a.voucher || 0)) + parseFloat(String(a.bonus || 0)) + parseFloat(String(a.mealAllowance || 0))).toFixed(2),
        }));
    }),

  // ============ FECHAR PRESENCA E CHECK-OUT ============
  closeAttendance: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce nao e o lider deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar todas as alocacoes
      const allocs = await db
        .select()
        .from(scheduleAllocations)
        .where(eq(scheduleAllocations.scheduleId, input));

      // Verificar se todos tem presenca marcada
      const unmarked = allocs.filter(a => !a.attendanceStatus);
      if (unmarked.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nem todos os diaristas tem presenca marcada",
        });
      }

      // Atualizar checkOutTime para todos
      await db
        .update(scheduleAllocations)
        .set({ checkOutTime: new Date() })
        .where(eq(scheduleAllocations.scheduleId, input));

      // Atualizar status do planejamento para validado
      const sched = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.id, input))
        .limit(1);
      const schedule = sched[0];
      const [client] = schedule
        ? await db.select().from(clients).where(eq(clients.id, schedule.clientId)).limit(1)
        : [null];

      await db
        .update(workSchedules)
        .set({ status: "validado" })
        .where(eq(workSchedules.id, input));

      // Notificar admins sobre fechamento de presenca
      const { notifyAttendanceClosed } = await import("../lib/sse-notifications");
      notifyAttendanceClosed({
        scheduleId: input,
        clientName: client?.name || "Sem nome",
        totalPeople: allocs.length,
        leaderId: ctx.user.id,
      });

      return { success: true };
    }),

  // ============ ALOCAR FUNCIONARIO RECÉM-CADASTRADO ============
  allocateNewEmployee: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        employeeId: z.number(),
        jobFunctionId: z.number(),
        payValue: z.number(),
        receiveValue: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce nao e o lider deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar se ja existe alocacao
      const existing = await db
        .select()
        .from(scheduleAllocations)
        .where(
          and(
            eq(scheduleAllocations.scheduleId, input.scheduleId),
            eq(scheduleAllocations.employeeId, input.employeeId)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Funcionario ja esta alocado neste planejamento",
        });
      }

      // Buscar ou criar schedule_function
      const funcs = await db
        .select()
        .from(scheduleFunctions)
        .where(
          and(
            eq(scheduleFunctions.scheduleId, input.scheduleId),
            eq(scheduleFunctions.jobFunctionId, input.jobFunctionId)
          )
        )
        .limit(1);
      let funcId = funcs[0]?.id;
      if (!funcId) {
        const result = await db.insert(scheduleFunctions).values([{
          scheduleId: input.scheduleId,
          jobFunctionId: input.jobFunctionId,
          payValue: input.payValue.toFixed(2),
          receiveValue: input.receiveValue.toFixed(2),
        }]);
        funcId = Number(result[0].insertId);
      }

      // Criar alocacao
      const result = await db.insert(scheduleAllocations).values([{
        scheduleId: input.scheduleId,
        scheduleFunctionId: funcId,
        employeeId: input.employeeId,
        payValue: input.payValue.toFixed(2),
        receiveValue: input.receiveValue.toFixed(2),
      }]);

      return { success: true, allocationId: Number(result[0].insertId) };
    }),

  removeAllocation: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        allocationId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce nao e o lider deste planejamento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [schedule] = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.id, input.scheduleId))
        .limit(1);
      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Planejamento nao encontrado",
        });
      }
      if (schedule.status === "validado") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nao e possivel remover diaristas de operacoes validadas",
        });
      }

      await db
        .delete(scheduleAllocations)
        .where(
          and(
            eq(scheduleAllocations.id, input.allocationId),
            eq(scheduleAllocations.scheduleId, input.scheduleId)
          )
        );

      return { success: true };
    }),

  allocationOptions: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(jobFunctions)
      .where(eq(jobFunctions.isActive, true));
  }),

  // ============ SOLICITAR ALTERACAO DE PIX ============
  requestPixChange: protectedProcedure
    .input(
      z.object({
        employeeId: z.number().optional(),
        cpf: z.string().optional(),
        newPixKey: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar funcionario por ID ou CPF
      let emp: typeof employees.$inferSelect | undefined;
      if (input.employeeId) {
        const result = await db
          .select()
          .from(employees)
          .where(eq(employees.id, input.employeeId))
          .limit(1);
        emp = result[0];
      } else if (input.cpf) {
        const result = await db
          .select()
          .from(employees)
          .where(eq(employees.cpf, input.cpf))
          .limit(1);
        emp = result[0];
      }

      if (!emp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funcionario nao encontrado",
        });
      }
      const targetEmployeeId = emp.id;
      const existingPending = await db
        .select()
        .from(pixChangeRequests)
        .where(
          and(
            eq(pixChangeRequests.employeeId, targetEmployeeId),
            eq(pixChangeRequests.status, "pendente")
          )
        )
        .limit(1);
      if (existingPending.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Já existe solicitação pendente para este funcionário",
        });
      }

      // Criar solicitacao
      const result = await db.insert(pixChangeRequests).values([{
        employeeId: targetEmployeeId,
        requestedByUserId: ctx.user.id,
        oldPixKey: emp.pixKey || null,
        newPixKey: input.newPixKey,
        status: "pendente",
      }]);

      // Notificar admins sobre nova solicitacao PIX
      const { notifyAdmins } = await import("../_core/sse");
      notifyAdmins({
        type: "pix_request_created",
        data: {
          requestId: Number(result[0].insertId),
          employeeName: emp.name,
          employeeCpf: emp.cpf,
          newPixKey: input.newPixKey,
          createdAt: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: "Solicitacao de alteracao PIX enviada para aprovacao",
      };
    }),

  // ============ LISTAR SOLICITAÇÕES PIX PENDENTES (admin only) ============
  listPixRequests: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["pendente", "aprovado", "rejeitado"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const requests = input?.status
        ? await db
            .select()
            .from(pixChangeRequests)
            .where(eq(pixChangeRequests.status, input.status))
        : await db.select().from(pixChangeRequests);

      // Enriquecer com dados do funcionário
      const empIds = Array.from(new Set(requests.map(r => r.employeeId)));
      const empMap: Record<number, any> = {};
      if (empIds.length > 0) {
        const emps = await db
          .select()
          .from(employees)
          .where(inArray(employees.id, empIds));
        emps.forEach(e => {
          empMap[e.id] = e;
        });
      }

      return requests.map(r => ({
        ...r,
        employeeName: empMap[r.employeeId]?.name || "—",
        employeeCpf: empMap[r.employeeId]?.cpf || "",
        currentPixKey: empMap[r.employeeId]?.pixKey || "",
        pixKeyType: empMap[r.employeeId]?.pixKeyType || "",
      }));
    }),

  // ============ APROVAR/REJEITAR ALTERACAO PIX (admin only) ============
  reviewPixRequest: adminProcedure
    .input(
      z.object({
        requestId: z.number(),
        approved: z.boolean(),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [request] = await db
        .select()
        .from(pixChangeRequests)
        .where(eq(pixChangeRequests.id, input.requestId))
        .limit(1);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }
      if (request.status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitação já revisada",
        });
      }

      // Buscar dados do funcionario
      const emps = await db
        .select()
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .limit(1);
      const emp = emps[0];

      if (input.approved) {
        // Atualizar chave PIX do funcionario
        await db
          .update(employees)
          .set({
            pixKey: request.newPixKey,
          })
          .where(eq(employees.id, request.employeeId));

        // Marcar solicitacao como aprovada
        await db
          .update(pixChangeRequests)
          .set({
            status: "aprovado",
            reviewedByUserId: ctx.user.id,
            reviewNotes: input.reviewNotes || null,
          })
          .where(eq(pixChangeRequests.id, input.requestId));

        // Notificar admins sobre aprovacao
        const { notifyAdmins } = await import("../_core/sse");
        notifyAdmins({
          type: "pix_request_reviewed",
          data: {
            requestId: input.requestId,
            employeeName: emp?.name || "Funcionario",
            status: "aprovado",
            reviewedByName: ctx.user.name,
            reviewNotes: input.reviewNotes,
            reviewedAt: new Date().toISOString(),
          },
        });
      } else {
        // Rejeitar
        const { notifyAdmins } = await import("../_core/sse");
        notifyAdmins({
          type: "pix_request_reviewed",
          data: {
            requestId: input.requestId,
            employeeName: emp?.name || "Funcionario",
            status: "rejeitado",
            reviewedByName: ctx.user.name,
            reviewNotes: input.reviewNotes,
            reviewedAt: new Date().toISOString(),
          },
        });

        await db
          .update(pixChangeRequests)
          .set({
            status: "rejeitado",
            reviewedByUserId: ctx.user.id,
            reviewNotes: input.reviewNotes || null,
          })
          .where(eq(pixChangeRequests.id, input.requestId));

        // Notificar lider sobre rejeicao
        const { notifyPixRequestReviewed } = await import("../lib/sse-notifications");
        notifyPixRequestReviewed({
          requestId: input.requestId,
          employeeName: emp?.name || "Funcionario",
          status: "rejeitado",
          reviewedByUserId: ctx.user.id,
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date().toISOString(),
        });
      }

      return { success: true };
    }),
});
