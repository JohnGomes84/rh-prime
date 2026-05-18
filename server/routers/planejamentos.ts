import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { eq, and, gte, lte, desc, sql, inArray, ne, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  workSchedules,
  scheduleFunctions,
  scheduleAllocations,
  employees,
  clients,
  clientUnits,
  shifts,
  jobFunctions,
  auditLogs,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { checkPermission } from "../controle/permissionControl";
import type { SystemModule } from "../../drizzle/schema";
import { assertScheduleTransition } from "../_core/stateGuards";
import { buildRecurringDates } from "../lib/schedule-recurring";
import { parseScheduleCsv } from "../lib/schedule-csv";
import {
  assertScheduleEditable,
  filterNewEmployeesWithoutDuplicate,
} from "../_core/criticalFlows";
import { dateString } from "../../shared/validators";

async function requirePermission(
  userId: number,
  userRole: string | undefined,
  module: SystemModule,
  action: "canView" | "canCreate" | "canEdit" | "canDelete"
) {
  if (userRole === "admin") return;
  const allowed = await checkPermission(userId, module, action);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Sem permissão para ${action} em ${module}`,
    });
  }
}

// Helper: recalcular totais de um planejamento
async function recalcScheduleTotals(scheduleId: number) {
  const db = await getDb();
  if (!db) return;
  const allocs = await db
    .select()
    .from(scheduleAllocations)
    .where(eq(scheduleAllocations.scheduleId, scheduleId));
  const totalPay = allocs.reduce(
    (sum, a) => sum + parseFloat(String(a.payValue || "0")),
    0
  );
  const totalReceive = allocs.reduce(
    (sum, a) => sum + parseFloat(String(a.receiveValue || "0")),
    0
  );
  const totalPeople = allocs.length;
  await db
    .update(workSchedules)
    .set({
      totalPayValue: totalPay.toFixed(2),
      totalReceiveValue: totalReceive.toFixed(2),
      totalPeople,
    })
    .where(eq(workSchedules.id, scheduleId));
}

async function getScheduleOrThrow(scheduleId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [schedule] = await db
    .select()
    .from(workSchedules)
    .where(eq(workSchedules.id, scheduleId))
    .limit(1);
  if (!schedule)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Planejamento não encontrado",
    });
  return { db, schedule };
}

type ScheduleCreatePayload = {
  date: string | Date;
  shiftId?: number | null;
  clientId: number;
  clientUnitId?: number | null;
  leaderId?: number | null;
  notes?: string | null;
};

async function createScheduleRecord(
  payload: ScheduleCreatePayload,
  options?: { skipIfExists?: boolean }
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const scheduleDate = payload.date instanceof Date ? payload.date : new Date(payload.date);
  const normalizedDate = new Date(scheduleDate);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  const nextDay = new Date(normalizedDate);
  nextDay.setUTCDate(normalizedDate.getUTCDate() + 1);

  const candidates = await db
    .select()
    .from(workSchedules)
    .where(
      and(
        gte(workSchedules.date, normalizedDate),
        lte(workSchedules.date, nextDay),
        eq(workSchedules.clientId, payload.clientId)
      )
    );

  const conflict = candidates.find(
    (s) =>
      (s.shiftId ?? null) === (payload.shiftId ?? null) &&
      (s.clientUnitId ?? null) === (payload.clientUnitId ?? null)
  );

  if (conflict) {
    if (options?.skipIfExists) {
      return { id: conflict.id, skipped: true };
    }

    throw new TRPCError({
      code: "CONFLICT",
      message: "Ja existe planejamento para este cliente/turno/local nesta data",
    });
  }

  const result = await db.insert(workSchedules).values({
    date: normalizedDate,
    shiftId: payload.shiftId ?? null,
    clientId: payload.clientId,
    clientUnitId: payload.clientUnitId ?? null,
    leaderId: payload.leaderId ?? null,
    notes: payload.notes ?? null,
  });

  return { id: Number(result[0].insertId), skipped: false };
}

export const planejamentosRouter = router({
  // ============ ALOCACAO HIBRIDA (VALIDACAO DE DUPLICIDADE) ============
  validateDuplicate: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        employeeId: z.number(),
      })
    )
    .query(async ({ input }) => {
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

      // Buscar alocacoes do mesmo funcionario no mesmo dia em outros planejamentos
      const conflictingAllocations = await db
        .select({
          scheduleId: scheduleAllocations.scheduleId,
          clientId: workSchedules.clientId,
          shiftId: workSchedules.shiftId,
          status: workSchedules.status,
        })
        .from(scheduleAllocations)
        .innerJoin(workSchedules, eq(scheduleAllocations.scheduleId, workSchedules.id))
        .where(
          and(
            eq(scheduleAllocations.employeeId, input.employeeId),
            eq(workSchedules.date, schedule.date),
            ne(workSchedules.id, input.scheduleId)
          )
        );

      if (conflictingAllocations.length > 0) {
        return {
          hasDuplicate: true,
          conflicts: conflictingAllocations,
        };
      }

      return { hasDuplicate: false, conflicts: [] };
    }),

  allocateWithException: protectedProcedure
    .input(
      z.object({
        scheduleFunctionId: z.number(),
        scheduleId: z.number(),
        employeeId: z.number(),
        justification: z.string().min(10, "Justificativa deve ter no minimo 10 caracteres"),
        payValue: z.string(),
        receiveValue: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Registrar na auditoria
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "duplicate_allocation_exception",
        entityType: "schedule",
        entityId: input.scheduleId,
        newValues: JSON.stringify({
          scheduleId: input.scheduleId,
          employeeId: input.employeeId,
          justification: input.justification,
        }),
        status: "success",
      });

      // Criar alocacao
      const [result] = await db.insert(scheduleAllocations).values({
        scheduleFunctionId: input.scheduleFunctionId,
        scheduleId: input.scheduleId,
        employeeId: input.employeeId,
        payValue: input.payValue,
        receiveValue: input.receiveValue,
        mealAllowance: "0",
        voucher: "0",
        bonus: "0",
      });

      return { success: true, allocationId: result.insertId };
    }),
  // ============ LISTAGEM COM FILTROS ============
  list: protectedProcedure
    .input(
      z
        .object({
          dateStart: z.string().optional(),
          dateEnd: z.string().optional(),
          clientId: z.number().optional(),
          shiftId: z.number().optional(),
          clientUnitId: z.number().optional(),
          status: z.enum(["pendente", "validado", "cancelado"]).optional(),
          employeeSearch: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canView"
      );
      const db = await getDb();
      if (!db) return [];

      // Buscar todos os schedules
      let results = await db
        .select()
        .from(workSchedules)
        .orderBy(desc(workSchedules.date));

      // Filtros
      if (input?.dateStart) {
        const ds = new Date(input.dateStart);
        results = results.filter(r => new Date(r.date) >= ds);
      }
      if (input?.dateEnd) {
        const de = new Date(input.dateEnd);
        de.setHours(23, 59, 59);
        results = results.filter(r => new Date(r.date) <= de);
      }
      if (input?.clientId)
        results = results.filter(r => r.clientId === input.clientId);
      if (input?.shiftId)
        results = results.filter(r => r.shiftId === input.shiftId);
      if (input?.clientUnitId)
        results = results.filter(r => r.clientUnitId === input.clientUnitId);
      if (input?.status)
        results = results.filter(r => r.status === input.status);

      // Filtro por funcionário: buscar scheduleIds que contêm esse funcionário
      if (input?.employeeSearch) {
        const s = input.employeeSearch.toLowerCase();
        const emps = await db.select().from(employees);
        const matchedEmpIds = emps
          .filter(e => e.name.toLowerCase().includes(s) || e.cpf?.includes(s))
          .map(e => e.id);
        if (matchedEmpIds.length === 0) return [];
        const allocs = await db
          .select({ scheduleId: scheduleAllocations.scheduleId })
          .from(scheduleAllocations)
          .where(inArray(scheduleAllocations.employeeId, matchedEmpIds));
        const scheduleIds = Array.from(new Set(allocs.map(a => a.scheduleId)));
        if (scheduleIds.length === 0) return [];
        results = results.filter(r => scheduleIds.includes(r.id));
      }

      // Enriquecer com dados de cliente, turno e unidade
      const [allClients, allShifts, allUnits] = await Promise.all([
        db.select().from(clients),
        db.select().from(shifts),
        db.select().from(clientUnits),
      ]);
      const clientMap = Object.fromEntries(allClients.map(c => [c.id, c]));
      const shiftMap = Object.fromEntries(allShifts.map(s => [s.id, s]));
      const unitMap = Object.fromEntries(allUnits.map(u => [u.id, u]));

      return results.map(r => ({
        ...r,
        clientName: clientMap[r.clientId]?.name || "—",
        clientCity: clientMap[r.clientId]?.city || "",
        shiftName: r.shiftId ? shiftMap[r.shiftId]?.name || "—" : "—",
        shiftTime: r.shiftId
          ? `${shiftMap[r.shiftId]?.startTime || ""} - ${shiftMap[r.shiftId]?.endTime || ""}`
          : "",
        unitName: r.clientUnitId ? unitMap[r.clientUnitId]?.name || "—" : "—",
      }));
    }),

  // ============ DETALHES COMPLETOS ============
  getById: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canView"
      );
      const db = await getDb();
      if (!db) return null;

      const [schedule] = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.id, input))
        .limit(1);
      if (!schedule) return null;

      // Buscar funções do planejamento
      const funcs = await db
        .select()
        .from(scheduleFunctions)
        .where(eq(scheduleFunctions.scheduleId, input));

      // Buscar alocações
      const allocs = await db
        .select()
        .from(scheduleAllocations)
        .where(eq(scheduleAllocations.scheduleId, input));

      // Buscar dados auxiliares
      const [allJobFuncs, allEmps] = await Promise.all([
        db.select().from(jobFunctions),
        db.select().from(employees),
      ]);
      const jfMap = Object.fromEntries(allJobFuncs.map(j => [j.id, j]));
      const empMap = Object.fromEntries(allEmps.map(e => [e.id, e]));

      // Montar estrutura hierárquica
      const functionsWithAllocations = funcs.map(f => {
        const funcAllocs = allocs.filter(a => a.scheduleFunctionId === f.id);
        return {
          ...f,
          jobFunctionName: jfMap[f.jobFunctionId]?.name || "—",
          allocatedCount: funcAllocs.length,
          allocations: funcAllocs.map(a => ({
            ...a,
            employeeName: empMap[a.employeeId]?.name || "—",
            employeeCpf: empMap[a.employeeId]?.cpf || "",
            employeeCity: empMap[a.employeeId]?.city || "",
            isPaid: a.paymentBatchId !== null,
          })),
        };
      });

      // Dados do cliente, turno, unidade
      const [clientData] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, schedule.clientId))
        .limit(1);
      const shiftData = schedule.shiftId
        ? (
            await db
              .select()
              .from(shifts)
              .where(eq(shifts.id, schedule.shiftId))
              .limit(1)
          )[0]
        : null;
      const unitData = schedule.clientUnitId
        ? (
            await db
              .select()
              .from(clientUnits)
              .where(eq(clientUnits.id, schedule.clientUnitId))
              .limit(1)
          )[0]
        : null;

      // Unidades do cliente (para o select)
      const units = await db
        .select()
        .from(clientUnits)
        .where(eq(clientUnits.clientId, schedule.clientId));

      return {
        ...schedule,
        clientName: clientData?.name || "—",
        shiftName: shiftData?.name || null,
        shiftTime: shiftData
          ? `${shiftData.startTime} - ${shiftData.endTime}`
          : null,
        unitName: unitData?.name || null,
        clientUnits: units,
        functions: functionsWithAllocations,
      };
    }),

  // ============ CRIAR PLANEJAMENTO ============
  create: protectedProcedure
    .input(
      z.object({
        date: dateString,
        shiftId: z.number().optional(),
        clientId: z.number(),
        clientUnitId: z.number().optional(),
        leaderId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canCreate"
      );
      const result = await createScheduleRecord({
        date: new Date(input.date),
        shiftId: input.shiftId ?? null,
        clientId: input.clientId,
        clientUnitId: input.clientUnitId ?? null,
        leaderId: input.leaderId ?? null,
        notes: input.notes ?? null,
      });
      return { id: result.id };
    }),

  createRecurring: protectedProcedure
    .input(
      z.object({
        date: dateString,
        shiftId: z.number().optional(),
        clientId: z.number(),
        clientUnitId: z.number().optional(),
        leaderId: z.number().optional(),
        notes: z.string().optional(),
        recurrence: z.object({
          frequency: z.enum(["weekly", "biweekly", "monthly"]),
          occurrences: z.number().min(2).max(52),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canCreate"
      );

      const dates = buildRecurringDates(
        new Date(input.date),
        input.recurrence.frequency,
        input.recurrence.occurrences
      );

      const createdIds: number[] = [];
      const skippedDates: string[] = [];

      for (const date of dates) {
        const result = await createScheduleRecord(
          {
            date,
            shiftId: input.shiftId ?? null,
            clientId: input.clientId,
            clientUnitId: input.clientUnitId ?? null,
            leaderId: input.leaderId ?? null,
            notes: input.notes ?? null,
          },
          { skipIfExists: true }
        );

        if (result.skipped) {
          skippedDates.push(date.toISOString().slice(0, 10));
        } else {
          createdIds.push(result.id);
        }
      }

      return {
        created: createdIds.length,
        createdIds,
        skipped: skippedDates.length,
        skippedDates,
      };
    }),

  importCsv: protectedProcedure
    .input(
      z.object({
        csvContent: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canCreate"
      );

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = parseScheduleCsv(input.csvContent);
      const [allClients, allShifts, allUnits, allEmployees] = await Promise.all([
        db.select().from(clients),
        db.select().from(shifts),
        db.select().from(clientUnits),
        db.select().from(employees),
      ]);

      const createdIds: number[] = [];
      const errors: string[] = [];
      let skipped = 0;

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const client = allClients.find(
          (item) => item.name.trim().toLowerCase() === row.client.trim().toLowerCase()
        );

        if (!client) {
          errors.push(`Linha ${index + 2}: cliente "${row.client}" nao encontrado`);
          continue;
        }

        const shift = row.shift
          ? allShifts.find((item) => item.name.trim().toLowerCase() === row.shift?.trim().toLowerCase())
          : null;
        if (row.shift && !shift) {
          errors.push(`Linha ${index + 2}: turno "${row.shift}" nao encontrado`);
          continue;
        }

        const unit = row.unit
          ? allUnits.find(
              (item) =>
                item.clientId === client.id &&
                item.name.trim().toLowerCase() === row.unit?.trim().toLowerCase()
            )
          : null;
        if (row.unit && !unit) {
          errors.push(`Linha ${index + 2}: unidade "${row.unit}" nao encontrada para ${client.name}`);
          continue;
        }

        const leader = row.leader
          ? allEmployees.find((item) => item.name.trim().toLowerCase() === row.leader?.trim().toLowerCase())
          : null;
        if (row.leader && !leader) {
          errors.push(`Linha ${index + 2}: lider "${row.leader}" nao encontrado`);
          continue;
        }

        const result = await createScheduleRecord(
          {
            date: row.date,
            shiftId: shift?.id ?? null,
            clientId: client.id,
            clientUnitId: unit?.id ?? null,
            leaderId: leader?.id ?? null,
            notes: row.notes ?? null,
          },
          { skipIfExists: true }
        );

        if (result.skipped) {
          skipped += 1;
        } else {
          createdIds.push(result.id);
        }
      }

      return {
        imported: createdIds.length,
        createdIds,
        skipped,
        errors,
      };
    }),

  // ============ ATUALIZAR PLANEJAMENTO ============
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        date: dateString.optional(),
        shiftId: z.number().nullable().optional(),
        clientId: z.number().optional(),
        clientUnitId: z.number().nullable().optional(),
        leaderId: z.number().nullable().optional(),
        status: z.enum(["pendente", "validado", "cancelado"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canEdit"
      );
      const { db, schedule } = await getScheduleOrThrow(input.id);
      const { id, ...data } = input;
      const updateData: Partial<typeof workSchedules.$inferInsert> = { ...data } as Partial<typeof workSchedules.$inferInsert>;
      if (data.date) updateData.date = new Date(data.date);
      if (data.status) {
        assertScheduleTransition(schedule.status, data.status);
      }
      if (
        schedule.status === "cancelado" &&
        data.status &&
        data.status !== "cancelado"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Planejamento cancelado não pode ser reaberto",
        });
      }
      await db
        .update(workSchedules)
        .set(updateData)
        .where(eq(workSchedules.id, id));
      return { success: true };
    }),

  // ============ EXCLUIR PLANEJAMENTO ============
  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canDelete"
      );
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Excluir em cascata: alocações -> funções -> planejamento
      await db
        .delete(scheduleAllocations)
        .where(eq(scheduleAllocations.scheduleId, input));
      await db
        .delete(scheduleFunctions)
        .where(eq(scheduleFunctions.scheduleId, input));
      await db.delete(workSchedules).where(eq(workSchedules.id, input));
      return { success: true };
    }),

  // ============ DUPLICAR PLANEJAMENTO ============
  duplicate: protectedProcedure
    .input(z.object({ scheduleId: z.number(), newDate: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canCreate"
      );
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [original] = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.id, input.scheduleId))
        .limit(1);
      if (!original)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Planejamento não encontrado",
        });

      // Criar novo planejamento
      const newDate = input.newDate ? new Date(input.newDate) : original.date;
      const [newSchedule] = await db.insert(workSchedules).values({
        date: newDate,
        shiftId: original.shiftId,
        clientId: original.clientId,
        clientUnitId: original.clientUnitId,
        leaderId: original.leaderId,
        status: "pendente",
        notes: original.notes,
      });
      const newScheduleId = Number(newSchedule.insertId);

      // Copiar funções (batch insert)
      const funcs = await db
        .select()
        .from(scheduleFunctions)
        .where(eq(scheduleFunctions.scheduleId, input.scheduleId));
      if (funcs.length > 0) {
        await db.insert(scheduleFunctions).values(
          funcs.map(f => ({
            scheduleId: newScheduleId,
            jobFunctionId: f.jobFunctionId,
            payValue: f.payValue,
            receiveValue: f.receiveValue,
          }))
        );
      }

      await recalcScheduleTotals(newScheduleId);
      return { id: newScheduleId };
    }),

  // ============ VALIDAR PLANEJAMENTO ============
  validate: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canEdit"
      );
      const { db, schedule } = await getScheduleOrThrow(input);
      assertScheduleTransition(schedule.status, "validado");
      await db
        .update(workSchedules)
        .set({ status: "validado" })
        .where(eq(workSchedules.id, input));
      return { success: true };
    }),

  // ============ FUNÇÕES DO PLANEJAMENTO ============
  functions: router({
    add: protectedProcedure
      .input(
        z.object({
          scheduleId: z.number(),
          jobFunctionId: z.number(),
          payValue: z.string().optional(),
          receiveValue: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "schedules",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Se não informou valores, buscar defaults da jobFunction ou clientFunction
        let pay = input.payValue || "0";
        let recv = input.receiveValue || "0";
        if (!input.payValue || !input.receiveValue) {
          const [jf] = await db
            .select()
            .from(jobFunctions)
            .where(eq(jobFunctions.id, input.jobFunctionId))
            .limit(1);
          if (jf) {
            pay = input.payValue || String(jf.defaultPayValue || "0");
            recv = input.receiveValue || String(jf.defaultReceiveValue || "0");
          }
        }

        const result = await db.insert(scheduleFunctions).values({
          scheduleId: input.scheduleId,
          jobFunctionId: input.jobFunctionId,
          payValue: pay,
          receiveValue: recv,
        });
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          payValue: z.string().optional(),
          receiveValue: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "schedules",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await db
          .update(scheduleFunctions)
          .set(data)
          .where(eq(scheduleFunctions.id, id));

        // Atualizar valores de todas as alocações desta função que não foram pagas
        if (data.payValue || data.receiveValue) {
          const updateAlloc: Partial<Pick<typeof scheduleAllocations.$inferInsert, "payValue" | "receiveValue">> = {};
          if (data.payValue) updateAlloc.payValue = data.payValue;
          if (data.receiveValue) updateAlloc.receiveValue = data.receiveValue;
          // Só atualiza alocações não pagas (paymentBatchId IS NULL)
          await db
            .update(scheduleAllocations)
            .set(updateAlloc)
            .where(
              and(
                eq(scheduleAllocations.scheduleFunctionId, id),
                isNull(scheduleAllocations.paymentBatchId)
              )
            );
        }

        // Recalcular totais
        const [func] = await db
          .select()
          .from(scheduleFunctions)
          .where(eq(scheduleFunctions.id, id))
          .limit(1);
        if (func) await recalcScheduleTotals(func.scheduleId);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number(), scheduleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "schedules",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Excluir alocações da função primeiro
        await db
          .delete(scheduleAllocations)
          .where(eq(scheduleAllocations.scheduleFunctionId, input.id));
        await db
          .delete(scheduleFunctions)
          .where(eq(scheduleFunctions.id, input.id));
        await recalcScheduleTotals(input.scheduleId);
        return { success: true };
      }),
  }),

  // ============ ALOCAÇÕES DE FUNCIONÁRIOS ============
  allocations: router({
    // Alocar múltiplos funcionários de uma vez
    addBatch: protectedProcedure
      .input(
        z.object({
          scheduleFunctionId: z.number(),
          scheduleId: z.number(),
          employeeIds: z.array(z.number()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "schedules",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [schedule] = await db
          .select()
          .from(workSchedules)
          .where(eq(workSchedules.id, input.scheduleId))
          .limit(1);
        if (!schedule)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Planejamento não encontrado",
          });
        assertScheduleEditable(schedule.status);

        // Buscar valores padrão da função
        const [func] = await db
          .select()
          .from(scheduleFunctions)
          .where(eq(scheduleFunctions.id, input.scheduleFunctionId))
          .limit(1);
        const payVal = func?.payValue || "0";
        const recvVal = func?.receiveValue || "0";

        // Buscar alocações existentes para evitar duplicatas
        const existing = await db
          .select()
          .from(scheduleAllocations)
          .where(and(eq(scheduleAllocations.scheduleId, input.scheduleId)));
        // 1. Prevenir alocação do mesmo funcionário em diferentes planejamentos no mesmo dia
        const scheduleDate = schedule.date; // Data do planejamento atual

        const existingAllocationsOnSameDate = await db
          .select({ employeeId: scheduleAllocations.employeeId, scheduleId: scheduleAllocations.scheduleId })
          .from(scheduleAllocations)
          .innerJoin(workSchedules, eq(scheduleAllocations.scheduleId, workSchedules.id))
          .where(and(
            eq(workSchedules.date, scheduleDate),
            inArray(scheduleAllocations.employeeId, input.employeeIds),
            // Excluir alocações do planejamento atual para não considerar como duplicidade consigo mesmo
            // e permitir adicionar múltiplos funcionários a diferentes funções no mesmo planejamento
            ne(workSchedules.id, input.scheduleId)
          ));

        const conflictingEmployees = existingAllocationsOnSameDate;

        if (conflictingEmployees.length > 0) {
          const conflictingEmployeeIds = Array.from(new Set(conflictingEmployees.map(c => c.employeeId)));
          const conflictingEmployeeNames = (await db.select({ name: employees.name }).from(employees).where(inArray(employees.id, conflictingEmployeeIds))).map(e => e.name);
          throw new TRPCError({
            code: "CONFLICT",
            message: `Os funcionários ${conflictingEmployeeNames.join(", ")} já estão alocados em outro planejamento na data ${scheduleDate.toISOString().split('T')[0]}.`,
          });
        }

        // 2. Prevenir alocação do mesmo funcionário na mesma função do mesmo planejamento
        const existingAllocationsInThisSchedule = await db
          .select()
          .from(scheduleAllocations)
          .where(eq(scheduleAllocations.scheduleId, input.scheduleId));

        const newEmpIds = filterNewEmployeesWithoutDuplicate(
          input.employeeIds,
          existingAllocationsInThisSchedule.map(e => e.employeeId)
        );

        if (newEmpIds.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Todos os funcionários selecionados já estão alocados neste planejamento ou em outro na mesma data.",
          });
        }

        await db.insert(scheduleAllocations).values(
          newEmpIds.map(empId => ({
            scheduleFunctionId: input.scheduleFunctionId,
            scheduleId: input.scheduleId,
            employeeId: empId,
            payValue: payVal,
            receiveValue: recvVal,
            mealAllowance: "0",
            voucher: "0",
            bonus: "0",
          }))
        );

        await recalcScheduleTotals(input.scheduleId);
        return { added: newEmpIds.length };
      }),

    // Atualizar valores individuais de um funcionário
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          scheduleId: z.number(),
          payValue: z.string().optional(),
          receiveValue: z.string().optional(),
          mealAllowance: z.string().optional(),
          voucher: z.string().optional(),
          bonus: z.string().optional(),
          attendanceStatus: z
            .enum(["presente", "faltou", "parcial"])
            .optional(),
          allocNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "schedules",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [schedule] = await db
          .select()
          .from(workSchedules)
          .where(eq(workSchedules.id, input.scheduleId))
          .limit(1);
        if (!schedule)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Planejamento não encontrado",
          });
        assertScheduleEditable(schedule.status);

        // Verificar se não está pago
        const [alloc] = await db
          .select()
          .from(scheduleAllocations)
          .where(eq(scheduleAllocations.id, input.id))
          .limit(1);
        if (alloc?.paymentBatchId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível alterar alocação já paga em lote",
          });
        }

        const { id, scheduleId, ...data } = input;
        await db
          .update(scheduleAllocations)
          .set(data)
          .where(eq(scheduleAllocations.id, id));
        await recalcScheduleTotals(scheduleId);
        return { success: true };
      }),

    // Remover alocação
    remove: protectedProcedure
      .input(z.object({ id: z.number(), scheduleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "schedules",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [schedule] = await db
          .select()
          .from(workSchedules)
          .where(eq(workSchedules.id, input.scheduleId))
          .limit(1);
        if (!schedule)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Planejamento não encontrado",
          });
        assertScheduleEditable(schedule.status);

        const [alloc] = await db
          .select()
          .from(scheduleAllocations)
          .where(eq(scheduleAllocations.id, input.id))
          .limit(1);
        if (alloc?.paymentBatchId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível remover alocação já paga em lote",
          });
        }

        await db
          .delete(scheduleAllocations)
          .where(eq(scheduleAllocations.id, input.id));
        await recalcScheduleTotals(input.scheduleId);
        return { success: true };
      }),
  }),

  // ============ CONTADORES PARA DASHBOARD ============
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, pendentes: 0, validados: 0 };
    const rows = await db
      .select({ status: workSchedules.status, count: sql<number>`count(*)` })
      .from(workSchedules)
      .groupBy(workSchedules.status);
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
    const total = rows.reduce((acc, r) => acc + Number(r.count), 0);
    return {
      total,
      pendentes: byStatus["pendente"] ?? 0,
      validados: byStatus["validado"] ?? 0,
    };
  }),

  // ============ DADOS AUXILIARES PARA FORMULÁRIOS ============
  formData: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      return { clients: [], shifts: [], jobFunctions: [], employees: [] };
    const [c, s, jf, e] = await Promise.all([
      db.select().from(clients).where(eq(clients.isActive, true)),
      db.select().from(shifts).where(eq(shifts.isActive, true)),
      db.select().from(jobFunctions).where(eq(jobFunctions.isActive, true)),
      db.select().from(employees),
    ]);
    return { clients: c, shifts: s, jobFunctions: jf, employees: e };
  }),

  // Unidades por cliente
  unitsByClient: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(clientUnits)
        .where(
          and(eq(clientUnits.clientId, input), eq(clientUnits.isActive, true))
        );
    }),

  // ============ MELHORIAS V2 ============

  // Lançamento rápido de Vale/Bônus/Marmita por CPF + Data
  quickAddAllowance: protectedProcedure
    .input(
      z.object({
        cpf: z.string(),
        date: dateString,
        type: z.enum(["voucher", "bonus", "mealAllowance"]),
        value: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canEdit"
      );
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.cpf, input.cpf))
        .limit(1);
      if (!emp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funcionário com este CPF não encontrado",
        });
      }

      const targetDate = new Date(input.date);
      const dayStart = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        0,
        0,
        0
      );
      const dayEnd = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23,
        59,
        59
      );

      const [schedule] = await db
        .select()
        .from(workSchedules)
        .where(and(gte(workSchedules.date, dayStart), lte(workSchedules.date, dayEnd)))
        .limit(1);

      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum planejamento encontrado para esta data",
        });
      }

      const [alloc] = await db
        .select()
        .from(scheduleAllocations)
        .where(
          and(
            eq(scheduleAllocations.scheduleId, schedule.id),
            eq(scheduleAllocations.employeeId, emp.id)
          )
        );

      if (!alloc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funcionário não está alocado neste planejamento",
        });
      }

      const updateData: Partial<Pick<typeof scheduleAllocations.$inferInsert, "voucher" | "bonus" | "mealAllowance">> = {};
      updateData[input.type] = input.value;
      await db
        .update(scheduleAllocations)
        .set(updateData)
        .where(eq(scheduleAllocations.id, alloc.id));
      await recalcScheduleTotals(schedule.id);

      return { success: true, message: `${input.type} lançado com sucesso` };
    }),

  // Resumo expandível de um planejamento
  getSummary: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "schedules",
        "canView"
      );
      const db = await getDb();
      if (!db) return null;

      const [schedule] = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.id, input))
        .limit(1);
      if (!schedule) return null;

      const allocs = await db
        .select()
        .from(scheduleAllocations)
        .where(eq(scheduleAllocations.scheduleId, input));
      const empMap = Object.fromEntries(
        (await db.select().from(employees)).map(e => [e.id, e])
      );

      const totalMealAllowance = allocs.reduce(
        (sum, a) => sum + parseFloat(String(a.mealAllowance || "0")),
        0
      );
      const totalVoucher = allocs.reduce(
        (sum, a) => sum + parseFloat(String(a.voucher || "0")),
        0
      );
      const totalBonus = allocs.reduce(
        (sum, a) => sum + parseFloat(String(a.bonus || "0")),
        0
      );
      const totalPayValue = allocs.reduce(
        (sum, a) => sum + parseFloat(String(a.payValue || "0")),
        0
      );
      const totalReceiveValue = allocs.reduce(
        (sum, a) => sum + parseFloat(String(a.receiveValue || "0")),
        0
      );
      const totalCost = totalPayValue + totalMealAllowance + totalVoucher + totalBonus;
      const margin = totalReceiveValue - totalCost;
      const marginPercent = totalReceiveValue > 0 ? ((margin / totalReceiveValue) * 100).toFixed(2) : "0";

      return {
        ...schedule,
        totalPeople: allocs.length,
        totalMealAllowance: totalMealAllowance.toFixed(2),
        totalVoucher: totalVoucher.toFixed(2),
        totalBonus: totalBonus.toFixed(2),
        totalPayValue: totalPayValue.toFixed(2),
        totalReceiveValue: totalReceiveValue.toFixed(2),
        totalCost: totalCost.toFixed(2),
        margin: margin.toFixed(2),
        marginPercent,
        allocations: allocs.map(a => ({
          ...a,
          employeeName: empMap[a.employeeId]?.name || "—",
          employeeCpf: empMap[a.employeeId]?.cpf || "",
        })),
      };
    }),
});
