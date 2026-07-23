import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isFeatureEnabled } from "../_core/feature-flags.js";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import {
  closeJourneyPeriod,
  createJourneyAdjustmentRequest,
  decideJourneyAdjustmentRequest,
  getJourneyDayTimeline,
  getJourneyDayEvaluation,
  getJourneyAdjustmentRequest,
  getJourneyPeriodSummary,
  getLatestJourneyReceipt,
  getJourneyTodayStatusForUser,
  listJourneyClosures,
  listJourneyAdjustmentRequests,
  listJourneyPunchEvents,
  reopenJourneyPeriod,
  registerJourneyPunchEventForUser,
  syncJourneyDayArtifacts,
} from "../modules/journey-v2/service.js";
import { assertEmployeeInScope, resolveEmployeeIdInScope } from "../utils/scope.js";

function assertJourneyV2Enabled() {
  if (!isFeatureEnabled("journey-v2-api")) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Journey V2 API is disabled.",
    });
  }
}

export const journeyV2Router = router({
  getTodayStatus: protectedProcedure
    .input(z.object({
      referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      return getJourneyTodayStatusForUser(
        ctx.user.id,
        ctx.user.email,
        input?.referenceDate,
      );
    }),
  listPunchEvents: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const employeeId = await resolveEmployeeIdInScope(input?.employeeId, ctx.user as any);
      await assertEmployeeInScope(ctx.user as any, employeeId);

      return listJourneyPunchEvents({
        employeeId,
        startDate: input?.startDate,
        endDate: input?.endDate,
      });
    }),
  getDayTimeline: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const employeeId = await resolveEmployeeIdInScope(input.employeeId, ctx.user as any);
      await assertEmployeeInScope(ctx.user as any, employeeId);

      return getJourneyDayTimeline(employeeId, input.referenceDate);
    }),
  getDayEvaluation: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const employeeId = await resolveEmployeeIdInScope(input.employeeId, ctx.user as any);
      await assertEmployeeInScope(ctx.user as any, employeeId);

      return getJourneyDayEvaluation(employeeId, input.referenceDate);
    }),
  getLatestReceipt: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const employeeId = await resolveEmployeeIdInScope(input?.employeeId, ctx.user as any);
      await assertEmployeeInScope(ctx.user as any, employeeId);

      return getLatestJourneyReceipt(employeeId);
    }),
  getPeriodSummary: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const employeeId = await resolveEmployeeIdInScope(input.employeeId, ctx.user as any);
      await assertEmployeeInScope(ctx.user as any, employeeId);

      return getJourneyPeriodSummary(employeeId, input.periodStart, input.periodEnd);
    }),
  syncDayArtifacts: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const employeeId = await resolveEmployeeIdInScope(input.employeeId, ctx.user as any);
      await assertEmployeeInScope(ctx.user as any, employeeId);

      return syncJourneyDayArtifacts(employeeId, input.referenceDate);
    }),
  listClosures: protectedProcedure
    .input(z.object({
      status: z.enum(["open", "under_review", "closed", "reopened"]).optional(),
      scope: z.enum(["mine", "team", "all"]).default("mine"),
      employeeId: z.number().int().positive().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const scope = input?.scope ?? "mine";
      const own = await db.getEmployeeForUser(ctx.user.id, ctx.user.email).catch(() => null);
      const ownId = (own as any)?.id ?? null;

      if (input?.employeeId) {
        await assertEmployeeInScope(ctx.user as any, input.employeeId);
        return listJourneyClosures({ employeeId: input.employeeId, status: input.status });
      }

      if (scope === "all" && ctx.user.role === "admin") {
        return listJourneyClosures({ status: input?.status });
      }

      if (scope === "team" && (ctx.user.role === "gestor" || ctx.user.role === "admin")) {
        if (ctx.user.role === "admin") {
          return listJourneyClosures({ status: input?.status });
        }
        if (!ownId) return [];
        const subs = await db.getSubordinatesRecursive(ownId);
        const employeeIds = Array.from(subs);
        if (employeeIds.length === 0) return [];
        return listJourneyClosures({ employeeIds, status: input?.status });
      }

      if (!ownId) return [];
      return listJourneyClosures({ employeeId: ownId, status: input?.status });
    }),
  closePeriod: managerProcedure
    .input(z.object({
      employeeId: z.number().int().positive(),
      periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertJourneyV2Enabled();
      await assertEmployeeInScope(ctx.user as any, input.employeeId);
      return closeJourneyPeriod({
        employeeId: input.employeeId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        closedByUserId: ctx.user.id,
        notes: input.notes,
      });
    }),
  reopenPeriod: managerProcedure
    .input(z.object({
      closureId: z.number().int().positive(),
      notes: z.string().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertJourneyV2Enabled();
      return reopenJourneyPeriod({
        closureId: input.closureId,
        reopenedByUserId: ctx.user.id,
        notes: input.notes,
      });
    }),
  listAdjustmentRequests: protectedProcedure
    .input(z.object({
      status: z.enum(["open", "under_review", "approved", "rejected", "cancelled"]).optional(),
      scope: z.enum(["mine", "team", "all"]).default("mine"),
      employeeId: z.number().int().positive().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const scope = input?.scope ?? "mine";
      const own = await db.getEmployeeForUser(ctx.user.id, ctx.user.email).catch(() => null);
      const ownId = (own as any)?.id ?? null;

      if (input?.employeeId) {
        await assertEmployeeInScope(ctx.user as any, input.employeeId);
        return listJourneyAdjustmentRequests({
          employeeId: input.employeeId,
          status: input.status,
        });
      }

      if (scope === "all" && ctx.user.role === "admin") {
        return listJourneyAdjustmentRequests({ status: input?.status });
      }

      if (scope === "team" && (ctx.user.role === "gestor" || ctx.user.role === "admin")) {
        if (ctx.user.role === "admin") {
          return listJourneyAdjustmentRequests({ status: input?.status });
        }
        if (!ownId) return [];
        const subs = await db.getSubordinatesRecursive(ownId);
        const employeeIds = Array.from(subs);
        if (employeeIds.length === 0) return [];
        return listJourneyAdjustmentRequests({
          employeeIds,
          status: input?.status,
        });
      }

      if (!ownId) return [];
      return listJourneyAdjustmentRequests({
        employeeId: ownId,
        status: input?.status,
      });
    }),
  getAdjustmentRequest: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const request = await getJourneyAdjustmentRequest(input.id);
      if (!request) return null;
      await assertEmployeeInScope(ctx.user as any, request.employeeId);
      return request;
    }),
  createAdjustmentRequest: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      requestType: z.enum([
        "missing_clock_in",
        "missing_break_start",
        "missing_break_end",
        "missing_clock_out",
        "wrong_context",
        "manual_correction",
      ]),
      justification: z.string().max(5000).optional(),
      requestedPayloadJson: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const employeeId = await resolveEmployeeIdInScope(input.employeeId, ctx.user as any);
      await assertEmployeeInScope(ctx.user as any, employeeId);

      return createJourneyAdjustmentRequest({
        employeeId,
        requestedByUserId: ctx.user.id,
        referenceDate: input.referenceDate,
        requestType: input.requestType,
        justification: input.justification,
        requestedPayloadJson: input.requestedPayloadJson,
      });
    }),
  decideAdjustmentRequest: managerProcedure
    .input(z.object({
      requestId: z.number().int().positive(),
      decision: z.enum(["approve", "reject", "return_for_completion"]),
      decisionNotes: z.string().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      const request = await getJourneyAdjustmentRequest(input.requestId);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao de ajuste V2 nao encontrada.",
        });
      }

      await assertEmployeeInScope(ctx.user as any, request.employeeId);

      try {
        return await decideJourneyAdjustmentRequest({
          requestId: input.requestId,
          decidedByUserId: ctx.user.id,
          decision: input.decision,
          decisionNotes: input.decisionNotes,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Falha ao decidir ajuste V2.",
        });
      }
    }),
  registerPunchEvent: protectedProcedure
    .input(z.object({
      eventType: z.enum(["clock_in", "break_start", "break_end", "clock_out"]),
      occurredAt: z.date().optional(),
      source: z.enum(["web", "mobile", "admin_manual", "api"]).optional(),
      sourceReference: z.string().max(120).optional(),
      deviceFingerprint: z.string().max(120).optional(),
      location: z.string().max(255).optional(),
      selfieUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertJourneyV2Enabled();

      try {
        return await registerJourneyPunchEventForUser(
          ctx.user.id,
          ctx.user.email,
          input,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Falha ao registrar evento no Journey V2.",
        });
      }
    }),
});
