import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { withDBRetry } from "../utils/retry";
import { TRPCError } from "@trpc/server";

export const timesheetRouter = router({
  // ============================================================
  // CONTROLE DE PONTO
  // ============================================================
  
  // Registrar entrada/saída
  clockIn: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      clockIn: z.date(),
      clockOut: z.date().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return withDBRetry(async () => {
        return db.createTimeRecord({
          employeeId: input.employeeId,
          clockIn: input.clockIn,
          clockOut: input.clockOut,
          location: input.location,
          notes: input.notes,
        });
      }, "clockIn");
    }),

  // Listar registros de ponto do funcionário
  listRecords: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return withDBRetry(async () => {
        return db.listTimeRecords(input.employeeId, input.startDate, input.endDate);
      }, "listTimeRecords");
    }),

  // Obter resumo de horas do mês
  monthlySummary: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      month: z.number().min(1).max(12),
      year: z.number(),
    }))
    .query(async ({ input }) => {
      return withDBRetry(async () => {
        return db.getMonthlyTimeSummary(input.employeeId, input.month, input.year);
      }, "monthlySummary");
    }),

  // ============================================================
  // HORAS EXTRAS
  // ============================================================

  // Solicitar horas extras
  requestOvertime: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      timeRecordId: z.string(),
      overtimeHours: z.number().min(0.5).max(24),
      type: z.enum(["50%", "100%", "NOTURNO"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
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

  // Listar solicitações de horas extras
  listOvertimeRequests: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    }))
    .query(async ({ input }) => {
      return withDBRetry(async () => {
        return db.listOvertimeRequests(input.employeeId, input.status);
      }, "listOvertimeRequests");
    }),

  // Aprovar/rejeitar horas extras
  approveOvertime: protectedProcedure
    .input(z.object({
      overtimeId: z.string(),
      approved: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return withDBRetry(async () => {
        return db.updateOvertimeRequest(input.overtimeId, {
          status: input.approved ? "APPROVED" : "REJECTED",
          approvedAt: new Date(),
          approvedById: ctx.user?.id,
          notes: input.notes,
        });
      }, "approveOvertime");
    }),

  // Obter estatísticas de horas extras
  overtimeStats: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      month: z.number().optional(),
      year: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return withDBRetry(async () => {
        return db.getOvertimeStats(input.employeeId, input.month, input.year);
      }, "overtimeStats");
    }),
});
