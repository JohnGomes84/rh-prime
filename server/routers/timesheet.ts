import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { withDBRetry } from "../utils/retry";
import { TRPCError } from "@trpc/server";

export const timesheetRouter = router({
  // ============================================================
  // CONTROLE DE PONTO
  // ============================================================
  
  // Registrar entrada
  clockIn: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      const employeeId = input?.employeeId || String(ctx.user?.id || "");
      if (!employeeId) throw new TRPCError({ code: "BAD_REQUEST", message: "ID do funcionário não encontrado" });

      // Verificar se já tem ponto aberto
      const openRecord = await db.getOpenTimeRecord(employeeId);
      if (openRecord) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "Você já tem um ponto aberto. Registre a saída antes de uma nova entrada." 
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
      employeeId: z.string().optional(),
      notes: z.string().optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      const employeeId = input?.employeeId || String(ctx.user?.id || "");
      if (!employeeId) throw new TRPCError({ code: "BAD_REQUEST", message: "ID do funcionário não encontrado" });

      // Buscar ponto aberto
      const openRecord = await db.getOpenTimeRecord(employeeId);
      if (!openRecord) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Nenhum ponto aberto encontrado. Registre a entrada primeiro." 
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
      employeeId: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const employeeId = input?.employeeId || String(ctx.user?.id || "");
      if (!employeeId) return null;

      return withDBRetry(async () => {
        return db.getOpenTimeRecord(employeeId);
      }, "getOpenRecord");
    }),

  // Listar registros de ponto do funcionário
  listRecords: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const employeeId = input?.employeeId || String(ctx.user?.id || "");
      return withDBRetry(async () => {
        return db.listTimeRecords(employeeId, input?.startDate, input?.endDate);
      }, "listTimeRecords");
    }),

  // Obter resumo de horas do mês
  monthlySummary: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      month: z.number().min(1).max(12),
      year: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const employeeId = input.employeeId || String(ctx.user?.id || "");
      return withDBRetry(async () => {
        return db.getMonthlyTimeSummary(employeeId, input.month, input.year);
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
