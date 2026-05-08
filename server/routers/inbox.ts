import { z } from "zod";
import { router, protectedProcedure, managerProcedure } from "../_core/trpc";
import * as db from "../db";

const REQUEST_KINDS = [
  "ferias",
  "atestado",
  "ajuste_ponto",
  "abono",
  "horas_extras",
  "declaracao",
  "adiantamento",
  "outro",
] as const;

export const inboxRouter = router({
  /**
   * Feed da inbox para o user logado.
   * - admin: vê tudo
   * - gestor: vê próprios + subordinados
   * - colaborador: vê próprios
   */
  feed: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          kind: z.string().optional(),
          scope: z.enum(["mine", "team", "all"]).default("mine"),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) return { items: [], scope: "none" as const };
      const scope = input?.scope ?? "mine";

      const ownEmp = await db.getEmployeeForUser(ctx.user.id, ctx.user.email).catch(() => null);
      const ownId = (ownEmp as any)?.id ?? null;

      if (scope === "all" && ctx.user.role === "admin") {
        const items = await db.listRequests({ status: input?.status, kind: input?.kind });
        return { items, scope };
      }

      if (scope === "team" && (ctx.user.role === "gestor" || ctx.user.role === "admin")) {
        if (ctx.user.role === "admin") {
          const items = await db.listRequests({ status: input?.status, kind: input?.kind });
          return { items, scope };
        }
        if (!ownId) return { items: [], scope };
        const subs = await db.getSubordinatesRecursive(ownId);
        const ids = Array.from(subs);
        if (ids.length === 0) return { items: [], scope };
        const items = await db.listRequests({
          employeeIds: ids,
          status: input?.status,
          kind: input?.kind,
        });
        return { items, scope };
      }

      // mine
      if (!ownId) return { items: [], scope };
      const items = await db.listRequests({
        employeeId: ownId,
        status: input?.status,
        kind: input?.kind,
      });
      return { items, scope };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const req = await db.getRequest(input.id);
      if (!req) return null;
      if (ctx.user) {
        const { assertEmployeeInScope } = await import("../utils/scope");
        await assertEmployeeInScope(ctx.user as any, (req as any).employeeId);
      }
      const approvals = await db.listApprovals(input.id);
      return { request: req, approvals };
    }),

  create: protectedProcedure
    .input(
      z.object({
        kind: z.enum(REQUEST_KINDS),
        subject: z.string().min(2).max(255),
        description: z.string().max(5000).optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
        payload: z.record(z.string(), z.any()).optional(),
        relatedResourceType: z.string().max(60).optional(),
        relatedResourceId: z.number().int().positive().optional(),
        employeeId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Login necessário");
      let empId = input.employeeId;
      if (!empId) {
        const own = await db.getEmployeeForUser(ctx.user.id, ctx.user.email).catch(() => null);
        empId = (own as any)?.id;
      }
      if (!empId) throw new Error("Funcionário não encontrado para o usuário logado");

      // Se input.employeeId é passado e é diferente do próprio, valida escopo
      if (input.employeeId) {
        const { assertEmployeeInScope } = await import("../utils/scope");
        await assertEmployeeInScope(ctx.user as any, input.employeeId);
      }

      return db.createRequest({
        kind: input.kind,
        employeeId: empId,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        payload: input.payload as any,
        relatedResourceType: input.relatedResourceType,
        relatedResourceId: input.relatedResourceId,
        createdById: ctx.user.id,
      } as any);
    }),

  decide: managerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        decision: z.enum(["APPROVED", "REJECTED"]),
        reason: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const req = await db.getRequest(input.id);
      if (!req) throw new Error("Solicitação não encontrada");
      const { assertEmployeeInScope } = await import("../utils/scope");
      await assertEmployeeInScope(ctx.user as any, (req as any).employeeId);

      await db.createApproval({
        requestId: input.id,
        approverUserId: ctx.user.id,
        level: 1,
        decision: input.decision,
        reason: input.reason,
        decidedAt: new Date(),
      } as any);

      await db.updateRequest(input.id, {
        status: input.decision,
        resolvedById: ctx.user.id,
        resolvedAt: new Date(),
      } as any);

      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const req = await db.getRequest(input.id);
      if (!req) throw new Error("Solicitação não encontrada");
      // Apenas o autor pode cancelar (ou admin)
      if (ctx.user?.role !== "admin" && (req as any).createdById !== ctx.user?.id) {
        throw new Error("Apenas o autor pode cancelar");
      }
      await db.updateRequest(input.id, { status: "CANCELLED" } as any);
      return { success: true };
    }),

  counts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return { mine: 0, team: 0, all: 0 };
    const ownEmp = await db.getEmployeeForUser(ctx.user.id, ctx.user.email).catch(() => null);
    const ownId = (ownEmp as any)?.id;

    let mine = 0;
    let team = 0;
    let all = 0;

    if (ownId) {
      const own = await db.listRequests({ employeeId: ownId, status: "PENDING" });
      mine = own.length;
    }

    if (ctx.user.role === "gestor" || ctx.user.role === "admin") {
      if (ctx.user.role === "admin") {
        const allList = await db.listRequests({ status: "PENDING" });
        all = allList.length;
        team = all;
      } else if (ownId) {
        const subs = await db.getSubordinatesRecursive(ownId);
        const ids = Array.from(subs);
        if (ids.length > 0) {
          const teamList = await db.listRequests({ employeeIds: ids, status: "PENDING" });
          team = teamList.length;
        }
      }
    }

    return { mine, team, all };
  }),
});
