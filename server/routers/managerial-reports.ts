import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc.js";
import * as mrDb from "../modules/managerial-reports/db.js";
import { getTemplate, STORED_TEMPLATE_KEYS } from "../modules/managerial-reports/templates.js";
import { computeDueDate } from "../modules/managerial-reports/period.js";
import { isOverdue, itemRollup } from "../modules/managerial-reports/view.js";

const SECTORS = ["rh_admin", "financeiro"] as const;
const CADENCES = ["semanal", "mensal"] as const;
const STATUSES = ["rascunho", "enviado", "validado", "devolvido"] as const;
const ITEM_STATUSES = ["pendente", "em_andamento", "concluido"] as const;

function isValidator(role: string | undefined): boolean {
  return role === "admin" || role === "gestor";
}

// Only the report's author or a validator (gestor/admin) may edit/submit a report.
function canEdit(authorId: number, user: { id: number; role?: string }): boolean {
  return authorId === user.id || isValidator(user.role);
}

export const managerialReportsRouter = router({
  listReports: protectedProcedure
    .input(
      z
        .object({
          sector: z.enum(SECTORS).optional(),
          cadence: z.enum(CADENCES).optional(),
          status: z.enum(STATUSES).optional(),
          periodRef: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      // Visibility: validators (gestor/admin) see all reports; everyone else
      // sees only the reports they authored.
      const scope = isValidator(ctx.user.role) ? {} : { authorId: ctx.user.id };
      const reports = await mrDb.listReports({ ...(input ?? {}), ...scope });
      const now = new Date();
      return reports.map((r) => ({ ...r, overdue: isOverdue(r, now) }));
    }),

  getReport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const data = await mrDb.getReport(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Relatório não encontrado" });
      // Visibility: only the author or a validator may open a specific report.
      // Use NOT_FOUND (not FORBIDDEN) so existence is not leaked to others.
      if (!isValidator(ctx.user.role) && data.report.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Relatório não encontrado" });
      }
      return {
        ...data,
        overdue: isOverdue(data.report, new Date()),
        rollup: itemRollup(data.items),
      };
    }),

  createFromTemplate: protectedProcedure
    .input(z.object({ templateKey: z.enum(STORED_TEMPLATE_KEYS), periodRef: z.string().min(4) }))
    .mutation(async ({ input, ctx }) => {
      const template = getTemplate(input.templateKey)!;
      const existing = await mrDb.findByPeriod(template.sector, template.cadence, input.periodRef);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe relatório para este setor/cadência/período",
        });
      }
      const dueDate = await computeDueDate(template.cadence, input.periodRef);
      const id = await mrDb.createFromTemplate({
        templateKey: template.key,
        periodRef: input.periodRef,
        dueDate,
        authorId: ctx.user.id,
      });
      return { id };
    }),

  updateReport: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        summary: z.string().optional(),
        pointsForValidator: z.string().optional(),
        nextPriorities: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const data = await mrDb.getReport(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canEdit(data.report.authorId, ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o autor ou um validador podem editar" });
      }
      if (data.report.status === "validado") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Relatório validado é imutável" });
      }
      const { id, ...patch } = input;
      await mrDb.updateReportFields(id, patch);
      return { ok: true };
    }),

  updateItem: protectedProcedure
    .input(
      z.object({
        reportId: z.number(),
        itemId: z.number(),
        value: z.string().optional(),
        itemStatus: z.enum(ITEM_STATUSES).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const data = await mrDb.getReport(input.reportId);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canEdit(data.report.authorId, ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o autor ou um validador podem editar" });
      }
      if (data.report.status === "validado") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Relatório validado é imutável" });
      }
      // Guard against IDOR: the item must belong to the report whose status we just checked.
      const ownsItem = data.items.some((i) => i.id === input.itemId);
      if (!ownsItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado neste relatório" });
      }
      await mrDb.updateItemFields(input.itemId, {
        value: input.value,
        itemStatus: input.itemStatus,
      });
      return { ok: true };
    }),

  submitForValidation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const data = await mrDb.getReport(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canEdit(data.report.authorId, ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o autor ou um validador podem enviar" });
      }
      if (!["rascunho", "devolvido"].includes(data.report.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Só rascunho/devolvido podem ser enviados" });
      }
      const now = new Date();
      const wasOnTime = !isOverdue({ dueDate: data.report.dueDate, status: "enviado" }, now);
      await mrDb.setReportStatus(input.id, {
        status: "enviado",
        submittedAt: now,
        wasOnTime,
      });
      return { ok: true };
    }),

  validate: protectedProcedure
    .input(z.object({ id: z.number(), approve: z.boolean(), rejectionNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!isValidator(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas validador (gestor/admin)" });
      }
      const data = await mrDb.getReport(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      if (data.report.status !== "enviado") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Só relatórios enviados podem ser validados" });
      }
      if (input.approve) {
        await mrDb.setReportStatus(input.id, {
          status: "validado",
          validatedAt: new Date(),
          validatedBy: ctx.user.id,
          lockedSnapshot: data as any,
        });
      } else {
        await mrDb.setReportStatus(input.id, {
          status: "devolvido",
          rejectionNote: input.rejectionNote ?? null,
        });
      }
      return { ok: true };
    }),
});
