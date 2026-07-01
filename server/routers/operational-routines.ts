import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import * as routinesDb from "../modules/operational-routines/db.js";

const clientStatus = z.enum(["active", "inactive"]);
const area = z.enum(["financeiro", "rh", "operacional", "administrativo"]);
const routineType = z.enum([
  "medicao",
  "nota_fiscal",
  "envio_boleto",
  "cobranca_retorno",
  "lancamento",
  "pagamento_operacional",
  "conferencia_baixa",
  "fechamento",
  "outro",
]);
const frequency = z.enum(["weekly", "biweekly", "monthly"]);
const priority = z.enum(["low", "medium", "high", "urgent"]);
const occurrenceStatus = z.enum([
  "pending",
  "in_progress",
  "waiting_return",
  "waiting_review",
  "done",
  "overdue",
  "not_applicable",
]);

function assertManager(role: string | undefined) {
  if (role !== "admin" && role !== "gestor") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin/gestor podem configurar rotinas" });
  }
}

const forbiddenSensitiveKeys = ["amount", "value", "valor", "bank", "banco", "account", "conta", "attachment", "anexo"];

function rejectSensitivePayload(value: Record<string, unknown>) {
  for (const key of forbiddenSensitiveKeys) {
    if (key in value) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Rotinas operacionais não armazenam valores, bancos ou anexos financeiros",
      });
    }
  }
}

const routinePayload = z
  .object({
    clientId: z.number().int().positive(),
    title: z.string().min(1).max(180),
    area: area.default("financeiro"),
    routineType,
    frequency: frequency.default("monthly"),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    generateLeadDays: z.number().int().min(0).max(60).default(7),
    reminderDays: z.array(z.number().int().min(0).max(30)).max(8).default([3, 1]),
    overdueReminderEnabled: z.boolean().default(true),
    assigneeUserId: z.number().int().positive().nullable().optional(),
    boardId: z.number().int().positive().nullable().optional(),
    listId: z.number().int().positive().nullable().optional(),
    priority: priority.default("medium"),
    requiresReview: z.boolean().default(false),
    checklistTemplate: z.array(z.string().min(1).max(255)).max(30).default([]),
    instructions: z.string().max(5000).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.frequency === "monthly" && !value.dayOfMonth) {
      ctx.addIssue({ code: "custom", message: "Rotina mensal exige dia do mês", path: ["dayOfMonth"] });
    }
    if (value.frequency !== "monthly" && value.dayOfWeek == null) {
      ctx.addIssue({ code: "custom", message: "Rotina semanal/quinzenal exige dia da semana", path: ["dayOfWeek"] });
    }
    if ((value.boardId && !value.listId) || (!value.boardId && value.listId)) {
      ctx.addIssue({ code: "custom", message: "Board e lista devem ser informados juntos", path: ["boardId"] });
    }
  });

export const operationalRoutinesRouter = router({
  clients: router({
    list: protectedProcedure.query(() => routinesDb.listClients()),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(160), notes: z.string().max(3000).nullable().optional() }).strict())
      .mutation(async ({ input, ctx }) => {
        assertManager(ctx.user.role);
        rejectSensitivePayload(input);
        return routinesDb.createClient({
          name: input.name.trim(),
          notes: input.notes ?? null,
          createdBy: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            name: z.string().min(1).max(160).optional(),
            status: clientStatus.optional(),
            notes: z.string().max(3000).nullable().optional(),
          })
          .strict(),
      )
      .mutation(async ({ input, ctx }) => {
        assertManager(ctx.user.role);
        rejectSensitivePayload(input);
        const { id, ...data } = input;
        await routinesDb.updateClient(id, data);
        return { ok: true };
      }),
  }),

  routines: router({
    list: protectedProcedure
      .input(z.object({ activeOnly: z.boolean().optional() }).optional())
      .query(({ input }) => routinesDb.listRoutines({ activeOnly: input?.activeOnly })),

    create: protectedProcedure.input(routinePayload).mutation(async ({ input, ctx }) => {
      assertManager(ctx.user.role);
      rejectSensitivePayload(input);
      return routinesDb.createRoutine({
        ...input,
        reminderDays: input.reminderDays,
        checklistTemplate: input.checklistTemplate,
        assigneeUserId: input.assigneeUserId ?? null,
        boardId: input.boardId ?? null,
        listId: input.listId ?? null,
        instructions: input.instructions ?? null,
        dayOfWeek: input.dayOfWeek ?? null,
        dayOfMonth: input.dayOfMonth ?? null,
        createdBy: ctx.user.id,
      } as any);
    }),

    update: protectedProcedure
      .input(routinePayload.partial().extend({ id: z.number().int().positive() }).strict())
      .mutation(async ({ input, ctx }) => {
        assertManager(ctx.user.role);
        rejectSensitivePayload(input);
        const { id, ...data } = input;
        await routinesDb.updateRoutine(id, {
          ...data,
          assigneeUserId: data.assigneeUserId ?? undefined,
          boardId: data.boardId ?? undefined,
          listId: data.listId ?? undefined,
          dayOfWeek: data.dayOfWeek ?? undefined,
          dayOfMonth: data.dayOfMonth ?? undefined,
          instructions: data.instructions ?? undefined,
        } as any);
        return { ok: true };
      }),

    toggleActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        assertManager(ctx.user.role);
        await routinesDb.updateRoutine(input.id, { isActive: input.isActive });
        return { ok: true };
      }),
  }),

  occurrences: router({
    list: protectedProcedure
      .input(
        z
          .object({
            from: z.string().optional(),
            to: z.string().optional(),
            status: occurrenceStatus.optional(),
            clientId: z.number().int().positive().optional(),
          })
          .optional(),
      )
      .query(({ input }) => routinesDb.listOccurrences(input ?? {})),

    generateNow: protectedProcedure
      .input(z.object({ routineId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        assertManager(ctx.user.role);
        const routine = await routinesDb.getRoutine(input.routineId);
        if (!routine) throw new TRPCError({ code: "NOT_FOUND", message: "Rotina não encontrada" });
        return routinesDb.createOccurrenceFromRoutine(routine, ctx.user.id);
      }),

    update: protectedProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            status: occurrenceStatus.optional(),
            nextAction: z.string().max(255).nullable().optional(),
            operationalNotes: z.string().max(5000).nullable().optional(),
          })
          .strict(),
      )
      .mutation(async ({ input }) => {
        rejectSensitivePayload(input);
        const { id, ...data } = input;
        await routinesDb.updateOccurrence(id, {
          ...data,
          completedAt: data.status === "done" ? new Date() : undefined,
        } as any);
        return { ok: true };
      }),

    markNotApplicable: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await routinesDb.markNotApplicable(input.id);
        return { ok: true };
      }),
  }),

  dashboard: router({
    summary: protectedProcedure.query(() => routinesDb.getDashboardSummary()),
  }),
});
