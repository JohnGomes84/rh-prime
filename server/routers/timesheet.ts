import { router, protectedProcedure, managerProcedure } from "../_core/trpc.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db.js";
import { withDBRetry } from "../utils/retry.js";
import { evaluateClockRecord, getActiveScheduleRule } from "../utils/journey-engine.js";
import { resolveEmployeeIdInScope } from "../utils/scope.js";
import { evaluateGeofence } from "../utils/geofence.js";

async function loadGeofenceConfig(): Promise<{ lat: number; lng: number; radiusM: number } | null> {
  const settings = (await db.listSettings()) as Array<{ key: string; value: string }>;
  const map = new Map(settings.map((s) => [s.key, s.value]));
  const lat = parseFloat(map.get("company.geofence_lat") ?? "");
  const lng = parseFloat(map.get("company.geofence_lng") ?? "");
  const radius = parseFloat(map.get("company.geofence_radius_m") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius) || radius <= 0) {
    return null;
  }
  return { lat, lng, radiusM: radius };
}

async function resolveEmployeeId(
  inputId: number | undefined,
  ctxUser: { id: number; email?: string; role: string } | undefined
): Promise<number> {
  return resolveEmployeeIdInScope(inputId, ctxUser as any);
}

export const timesheetRouter = router({
  // CONTROLE DE PONTO
  // ============================================================

  // Registrar entrada
  clockIn: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      location: z.string().max(255).optional(),
      notes: z.string().max(2000).optional(),
      selfieUrl: z.string().max(500).optional(),
      deviceFingerprint: z.string().max(120).optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      const employeeId = await resolveEmployeeId(input?.employeeId, ctx.user);

      const openRecord = await db.getOpenTimeRecord(employeeId);
      if (openRecord) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Você já tem um ponto aberto. Registre a saída antes de uma nova entrada.",
        });
      }

      const geofenceCfg = await loadGeofenceConfig().catch(() => null);
      const geofenceStatus = evaluateGeofence(input?.location, geofenceCfg);

      return withDBRetry(async () => {
        return db.createTimeRecord({
          employeeId,
          clockIn: new Date(),
          location: input?.location,
          notes: input?.notes,
          selfieUrl: input?.selfieUrl,
          geofenceStatus: geofenceStatus as any,
          deviceFingerprint: input?.deviceFingerprint,
        } as any);
      }, "clockIn");
    }),

  // Registrar saída (atualiza registro aberto)
  clockOut: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      notes: z.string().max(2000).optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      const employeeId = await resolveEmployeeId(input?.employeeId, ctx.user);

      const openRecord = await db.getOpenTimeRecord(employeeId);
      if (!openRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum ponto aberto encontrado. Registre a entrada primeiro.",
        });
      }

      const clockOut = new Date();
      const clockIn = new Date(openRecord.clockIn);
      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const rule = await getActiveScheduleRule(employeeId);
      let evaluation = null as Awaited<ReturnType<typeof evaluateClockRecord>> | null;
      if (rule) {
        evaluation = await evaluateClockRecord({ clockIn, clockOut, rule });
      }

      const result = await withDBRetry(async () => {
        return db.updateTimeRecord(openRecord.id, {
          clockOut,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          status: evaluation && evaluation.delayMinutes > 0 ? "PENDING" : "APPROVED",
          notes: evaluation
            ? `Esperado ${evaluation.expectedMinutes}min · Trabalhado ${evaluation.workedMinutes}min` +
              (evaluation.delayMinutes > 0 ? ` · Atraso ${evaluation.delayMinutes}min` : "") +
              (evaluation.overtime.total > 0 ? ` · HE ${evaluation.overtime.total}min` : "")
            : undefined,
        });
      }, "clockOut");

      // Persistir movimentos derivados
      if (evaluation) {
        if (evaluation.overtime.total > 0) {
          const type = evaluation.overtime.type100 > 0
            ? "100%"
            : evaluation.overtime.typeNight > 0
              ? "NOTURNO"
              : "50%";
          const dateStr = clockIn.toISOString().slice(0, 10);
          const auth = await db.findOvertimeAuthorizationFor(employeeId, dateStr).catch(() => null);
          try {
            const otRequest: any = {
              employeeId,
              timeRecordId: openRecord.id,
              overtimeHours: Math.round((evaluation.overtime.total / 60) * 100) / 100,
              type,
              reason: evaluation.notes.join("; "),
            };
            const otId = await db.createOvertimeRequest(otRequest);
            if (auth && otId && (otId as any).id) {
              await db.updateOvertimeRequest((otId as any).id, {
                status: "APPROVED",
                approvedAt: new Date(),
                approvedById: auth.authorizedById ?? null,
              });
              await db.consumeOvertimeAuthorization(auth.id);
            }
          } catch (e) { /* sem bloquear clockOut */ }
        }
        if (rule?.hourBankEnabled && (evaluation.hourBank.credit > 0 || evaluation.hourBank.debit > 0)) {
          try {
            const balance = (evaluation.hourBank.credit - evaluation.hourBank.debit) / 60;
            const refMonth = new Date(clockOut.getFullYear(), clockOut.getMonth(), 1);
            const expiry = new Date(refMonth);
            expiry.setMonth(expiry.getMonth() + 18);
            await db.createTimeBankEntry({
              employeeId,
              referenceMonth: refMonth as any,
              hoursBalance: String(Math.round(balance * 100) / 100),
              expiryDate: expiry as any,
              status: "Ativo",
              observations: `Movimento automático do clockOut em ${clockOut.toISOString()}`,
            } as any);
          } catch (e) { /* sem bloquear */ }
        }
      }

      return { ...result, evaluation };
    }),

  // Buscar ponto aberto (sem saída registrada)
  getOpenRecord: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      let id = input?.employeeId;
      if (!id && ctx.user) {
        const emp = await db.getEmployeeForUser(ctx.user.id, ctx.user.email);
        if (emp) id = (emp as any).id;
      }
      if (!id) return null;

      return withDBRetry(async () => {
        return db.getOpenTimeRecord(id);
      }, "getOpenRecord");
    }),

  // Listar registros de ponto do funcionário
  listRecords: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const employeeId = await resolveEmployeeId(input?.employeeId, ctx.user);
      return withDBRetry(async () => {
        return db.listTimeRecords(employeeId, input?.startDate, input?.endDate);
      }, "listTimeRecords");
    }),

  monthlySummary: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
    }))
    .query(async ({ input, ctx }) => {
      const employeeId = await resolveEmployeeId(input.employeeId, ctx.user);
      return withDBRetry(async () => {
        return db.getMonthlyTimeSummary(employeeId, input.month, input.year);
      }, "monthlySummary");
    }),

  // HORAS EXTRAS
  requestOvertime: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive(),
      timeRecordId: z.number().int().positive(),
      overtimeHours: z.number().min(0.5).max(24),
      type: z.enum(["50%", "100%", "NOTURNO"]),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      return withDBRetry(async () => {
        return db.createOvertimeRequest({
          employeeId: input.employeeId,
          timeRecordId: input.timeRecordId,
          overtimeHours: input.overtimeHours,
          type: input.type,
          reason: input.reason,
        });
      }, "requestOvertime");
    }),

  listOvertimeRequests: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    }))
    .query(async ({ input }) => {
      return withDBRetry(async () => {
        return db.listOvertimeRequests(input.employeeId, input.status);
      }, "listOvertimeRequests");
    }),

  approveOvertime: managerProcedure
    .input(z.object({
      overtimeId: z.number().int().positive(),
      approved: z.boolean(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return withDBRetry(async () => {
        return db.updateOvertimeRequest(input.overtimeId, {
          status: input.approved ? "APPROVED" : "REJECTED",
          approvedAt: new Date(),
          approvedById: ctx.user.id,
          notes: input.notes,
        });
      }, "approveOvertime");
    }),

  // === Pré-autorização de overtime (admin) ===
  preauthorizeOvertime: managerProcedure
    .input(z.object({
      employeeId: z.number().int().positive(),
      authorizedDate: z.string(),
      maxHours: z.number().positive().max(24),
      type: z.enum(["50%", "100%", "NOTURNO"]).default("50%"),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return db.createOvertimeAuthorization({
        employeeId: input.employeeId,
        authorizedDate: input.authorizedDate as any,
        maxHours: String(input.maxHours) as any,
        type: input.type,
        authorizedById: ctx.user.id,
        reason: input.reason,
      } as any);
    }),

  listAuthorizations: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      date: z.string().optional(),
      consumed: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => db.listOvertimeAuthorizations(input)),

  // === Aprovação em massa de time_records ===
  bulkApprove: managerProcedure
    .input(z.object({
      ids: z.array(z.number().int().positive()).min(1).max(500),
      status: z.enum(["APPROVED", "REJECTED"]),
    }))
    .mutation(async ({ input, ctx }) => {
      return db.bulkUpdateTimeRecordStatus(input.ids, input.status, ctx.user.id);
    }),

  // === Espelho de ponto ===
  report: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const id = await resolveEmployeeId(input.employeeId, ctx.user);
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);

      const records = await db.getTimesheetReport(id, start, end) as any[];
      const rule = await getActiveScheduleRule(id);

      let totalExpected = 0, totalWorked = 0, totalDelay = 0, totalOvertime = 0, totalNight = 0, totalHB = 0;
      const days: any[] = [];

      for (const r of records) {
        if (!r.clockOut || !rule) {
          days.push({
            id: r.id,
            date: new Date(r.clockIn).toISOString().slice(0, 10),
            clockIn: r.clockIn,
            clockOut: r.clockOut,
            status: r.status,
            location: r.location,
            evaluation: null,
          });
          continue;
        }
        const ev = await evaluateClockRecord({
          clockIn: new Date(r.clockIn),
          clockOut: new Date(r.clockOut),
          rule,
        });
        totalExpected += ev.expectedMinutes;
        totalWorked += ev.workedMinutes;
        totalDelay += ev.delayMinutes;
        totalOvertime += ev.overtime.total;
        totalNight += ev.overtime.typeNight;
        totalHB += ev.hourBank.credit - ev.hourBank.debit;
        days.push({
          id: r.id,
          date: new Date(r.clockIn).toISOString().slice(0, 10),
          clockIn: r.clockIn,
          clockOut: r.clockOut,
          status: r.status,
          location: r.location,
          evaluation: ev,
        });
      }

      return {
        rule,
        days,
        totals: {
          expectedMinutes: totalExpected,
          workedMinutes: totalWorked,
          delayMinutes: totalDelay,
          overtimeMinutes: totalOvertime,
          nightMinutes: totalNight,
          hourBankBalance: totalHB,
        },
      };
    }),

  evaluate: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      clockIn: z.string(),
      clockOut: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const id = await resolveEmployeeId(input.employeeId, ctx.user);
      const rule = await getActiveScheduleRule(id);
      if (!rule) return { rule: null, evaluation: null };
      const evaluation = await evaluateClockRecord({
        clockIn: new Date(input.clockIn),
        clockOut: new Date(input.clockOut),
        rule,
      });
      return { rule, evaluation };
    }),

  overtimeStats: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      month: z.number().int().min(1).max(12).optional(),
      year: z.number().int().min(2000).max(2100).optional(),
    }))
    .query(async ({ input }) => {
      return withDBRetry(async () => {
        return db.getOvertimeStats(input.employeeId, input.month, input.year);
      }, "overtimeStats");
    }),
});
