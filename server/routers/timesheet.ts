import { router, protectedProcedure, managerProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { withDBRetry } from "../utils/retry";

function resolveEmployeeId(inputId: number | undefined, ctxUserId: number | undefined): number {
  const id = inputId ?? ctxUserId;
  if (!id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "ID do funcionário não encontrado" });
  }
  return id;
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
    }).optional())
    .mutation(async ({ input, ctx }) => {
      const employeeId = resolveEmployeeId(input?.employeeId, ctx.user?.id);

      const openRecord = await db.getOpenTimeRecord(employeeId);
      if (openRecord) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Você já tem um ponto aberto. Registre a saída antes de uma nova entrada.",
        });
      }

      return withDBRetry(async () => {
        return db.createTimeRecord({
          employeeId,
          clockIn: new Date(),
          location: input?.location,
          notes: input?.notes,
        });
      }, "clockIn");
    }),

  // Registrar saída (atualiza registro aberto)
  clockOut: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      notes: z.string().max(2000).optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      const employeeId = resolveEmployeeId(input?.employeeId, ctx.user?.id);

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

      return withDBRetry(async () => {
        return db.updateTimeRecord(openRecord.id, {
          clockOut,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          status: "APPROVED",
        });
      }, "clockOut");
    }),

  // Buscar ponto aberto (sem saída registrada)
  getOpenRecord: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const id = input?.employeeId ?? ctx.user?.id;
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
      const employeeId = resolveEmployeeId(input?.employeeId, ctx.user?.id);
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
      const employeeId = resolveEmployeeId(input.employeeId, ctx.user?.id);
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
