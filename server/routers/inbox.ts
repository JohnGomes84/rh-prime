import { z } from "zod";
import { router, protectedProcedure, managerProcedure } from "../_core/trpc.js";
import * as db from "../db.js";
import { validateVacationRequest, calendarDaysBetween } from "../utils/vacation-rules.js";

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

/**
 * Validação server-side de uma solicitação de férias.
 * Nunca confia no `days` enviado pelo cliente: deriva dos dates no servidor e
 * aplica as regras CLT contra o saldo atual do período aquisitivo no banco.
 * Retorna os valores normalizados (server-derived) para persistir no payload.
 */
async function assertValidFeriasPayload(payload: unknown, employeeId: number) {
  const p = (payload ?? {}) as Record<string, any>;
  const vacationId = Number(p.vacationId);
  const startDate = String(p.startDate ?? "");
  const endDate = String(p.endDate ?? "");
  const abonoDays = Number(p.abonoDays ?? 0);
  if (!vacationId) throw new Error("Período aquisitivo (vacationId) é obrigatório para férias.");
  if (!startDate || !endDate) throw new Error("Datas de início e fim são obrigatórias.");
  const days = calendarDaysBetween(startDate, endDate);
  const vacation = await db.getVacation(vacationId);
  if (!vacation) throw new Error("Período aquisitivo não encontrado.");
  if ((vacation as any).employeeId !== employeeId) {
    throw new Error("Período aquisitivo não pertence ao funcionário da solicitação.");
  }
  const existing = await db.listVacationPeriods(vacationId);
  const result = validateVacationRequest({
    daysEntitled: (vacation as any).daysEntitled,
    daysTaken: (vacation as any).daysTaken ?? 0,
    existingPeriods: (existing as any[]).map((x) => ({ days: x.days })),
    startDate,
    endDate,
    days,
    abonoDays,
  });
  if (!result.valid) {
    throw new Error("Solicitação de férias inválida: " + result.errors.join(" "));
  }
  return { vacationId, startDate, endDate, days, abonoDays };
}

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
        const { assertEmployeeInScope } = await import("../utils/scope.js");
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
        const { assertEmployeeInScope } = await import("../utils/scope.js");
        await assertEmployeeInScope(ctx.user as any, input.employeeId);
      }

      // Férias: valida CLT no servidor e normaliza o payload (days derivado no servidor).
      let payload = input.payload;
      if (input.kind === "ferias") {
        const f = await assertValidFeriasPayload(input.payload, empId);
        payload = { ...(input.payload ?? {}), ...f };
      }

      return db.createRequest({
        kind: input.kind,
        employeeId: empId,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        payload: payload as any,
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
      // Idempotência: uma solicitação já resolvida não pode ser decidida de novo
      // (evita criar período de férias em duplicidade / dobrar daysTaken).
      const currentStatus = (req as any).status;
      if (currentStatus === "APPROVED" || currentStatus === "REJECTED" || currentStatus === "CANCELLED") {
        throw new Error("Esta solicitação já foi decidida.");
      }
      const { assertEmployeeInScope } = await import("../utils/scope.js");
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

      // Post-approval hooks
      if (input.decision === "APPROVED") {
        const reqData = req as any;
        if (reqData.kind === "ferias" && reqData.payload) {
          const p = reqData.payload as Record<string, any>;
          // days é sempre derivado das datas no servidor — nunca confiar no payload.
          const days = p.startDate && p.endDate
            ? calendarDaysBetween(String(p.startDate), String(p.endDate))
            : 0;
          if (p.vacationId && days > 0) {
            const abonoDays = Number(p.abonoDays ?? 0);
            await db.createVacationPeriod({
              vacationId: p.vacationId,
              employeeId: reqData.employeeId,
              startDate: new Date(p.startDate),
              endDate: new Date(p.endDate),
              days,
              isPecuniaryAllowance: abonoDays > 0,
              pecuniaryDays: abonoDays,
              noticeDate: new Date(),
              status: "Agendada",
            } as any);
            const vacation = await db.getVacation(p.vacationId);
            if (vacation) {
              await db.updateVacation(p.vacationId, {
                daysTaken: ((vacation as any).daysTaken ?? 0) + days + abonoDays,
                status: "Agendada",
              } as any);
            }
          }
        }
      }

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
