import { router, protectedProcedure, managerProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { withDBRetry } from "../utils/retry";

export const timesheetRouter = router({
  // CONTROLE DE PONTO
  clockIn: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive(),
      clockIn: z.date(),
      clockOut: z.date().optional(),
      location: z.string().max(255).optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
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

  listRecords: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return withDBRetry(async () => {
        return db.listTimeRecords(input.employeeId, input.startDate, input.endDate);
      }, "listTimeRecords");
    }),

  monthlySummary: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive(),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
    }))
    .query(async ({ input }) => {
      return withDBRetry(async () => {
        return db.getMonthlyTimeSummary(input.employeeId, input.month, input.year);
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
