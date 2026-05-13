import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc.js";
import * as db from "../db.js";
import { isFeatureEnabled } from "../_core/feature-flags.js";
import {
  instantiateCatalogForWorkflow,
  listChecklistWithEvidence,
  reviewChecklistItem,
  waiveChecklistItem,
} from "../services/admission-checklist.service.js";
import { toDate, toDateOpt } from "../utils/type-converters.js";

function assertAdmissionV2Enabled() {
  if (!isFeatureEnabled("admission-v2")) {
    throw new Error("Feature admission-v2 is not enabled");
  }
}

export const lifecycleRouter = router({
  // ============================================================
  // Admission
  // ============================================================
  admission: router({
    list: adminProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => db.listAdmissionWorkflows(input)),

    get: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const wf = await db.getAdmissionWorkflow(input.id);
        if (!wf) return null;
        const checklist = await db.listAdmissionChecklist(input.id);
        return { workflow: wf, checklist };
      }),

    create: adminProcedure
      .input(
        z.object({
          candidateName: z.string().min(2).max(255),
          candidateEmail: z.string().email().optional(),
          candidateCpf: z.string().max(14).optional(),
          candidatePhone: z.string().max(20).optional(),
          positionId: z.number().int().positive().optional(),
          departmentId: z.number().int().positive().optional(),
          managerId: z.number().int().positive().optional(),
          proposedSalary: z.number().min(0).optional(),
          proposedHireDate: z.string().optional(),
          contractType: z.enum(["CLT", "Estágio", "Temporário", "Experiência"]).default("CLT"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const useAdmissionV2 = isFeatureEnabled("admission-v2");
        const data: any = {
          ...input,
          proposedSalary: input.proposedSalary !== undefined ? String(input.proposedSalary) : undefined,
          proposedHireDate: toDateOpt(input.proposedHireDate),
          createdById: ctx.user?.id,
          catalogVersion: useAdmissionV2 ? "v1.0" : undefined,
        };
        const result = await db.createAdmissionWorkflow(data, {
          populateDefaultChecklist: !useAdmissionV2,
        });
        if (useAdmissionV2 && result?.id) {
          await instantiateCatalogForWorkflow(result.id, "v1.0");
        }
        return result;
      }),

    checklist: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        assertAdmissionV2Enabled();
        const workflow = await db.getAdmissionWorkflow(input.id);
        if (!workflow) return null;
        const checklist = await listChecklistWithEvidence(input.id);
        return {
          workflow,
          checklist,
        };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z
            .enum(["DRAFT", "DOCS_PENDING", "VALIDATING", "APPROVED", "ACTIVE", "REJECTED", "CANCELLED"])
            .optional(),
          currentStep: z.string().max(60).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        return db.updateAdmissionWorkflow(id, rest as any);
      }),

    completeChecklistItem: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          completed: z.boolean(),
          documentUrl: z.string().max(500).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.updateAdmissionChecklistItem(input.id, {
          completed: input.completed,
          completedAt: input.completed ? new Date() : null,
          completedById: input.completed ? ctx.user?.id : null,
          documentUrl: input.documentUrl,
          notes: input.notes,
        } as any);
      }),

    waiveChecklistItem: adminProcedure
      .input(
        z.object({
          workflowId: z.number().int().positive(),
          itemId: z.number().int().positive(),
          waivedReason: z.string().min(3),
        })
      )
      .mutation(async ({ input, ctx }) => {
        assertAdmissionV2Enabled();
        return waiveChecklistItem(
          input.workflowId,
          input.itemId,
          ctx.user?.id,
          input.waivedReason
        );
      }),

    reviewChecklistItem: adminProcedure
      .input(
        z.object({
          workflowId: z.number().int().positive(),
          itemId: z.number().int().positive(),
          reviewStatus: z.enum(["pending", "approved", "rejected"]),
          reviewNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        assertAdmissionV2Enabled();
        return reviewChecklistItem(
          input.workflowId,
          input.itemId,
          ctx.user?.id,
          input.reviewStatus,
          input.reviewNotes
        );
      }),

    finalize: adminProcedure
      .input(z.object({ id: z.number().int().positive(), employeeId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        return db.updateAdmissionWorkflow(input.id, {
          status: "ACTIVE" as any,
          resultEmployeeId: input.employeeId,
          completedAt: new Date(),
        } as any);
      }),
  }),

  // ============================================================
  // Movement
  // ============================================================
  movement: router({
    listByEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user) {
          const { assertEmployeeInScope } = await import("../utils/scope");
          await assertEmployeeInScope(ctx.user as any, input.employeeId);
        }
        return db.listEmployeeMovements(input.employeeId);
      }),

    create: adminProcedure
      .input(
        z.object({
          employeeId: z.number().int().positive(),
          kind: z.enum([
            "promocao",
            "transferencia_dept",
            "troca_gestor",
            "ajuste_salarial",
            "mudanca_jornada",
            "mudanca_centro_custo",
            "mudanca_cargo",
          ]),
          fromValue: z.string().optional(),
          toValue: z.string().optional(),
          effectiveDate: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createEmployeeMovement({
          ...input,
          effectiveDate: toDate(input.effectiveDate),
          createdById: ctx.user?.id,
        } as any);
      }),
  }),

  // ============================================================
  // Termination
  // ============================================================
  termination: router({
    list: adminProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => db.listTerminations(input)),

    get: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const term = await db.getTermination(input.id);
        if (!term) return null;
        const devolution = await db.listTerminationDevolution(input.id);
        return { termination: term, devolution };
      }),

    create: adminProcedure
      .input(
        z.object({
          employeeId: z.number().int().positive(),
          noticeDate: z.string(),
          lastWorkingDay: z.string(),
          reason: z.enum([
            "sem_justa_causa",
            "pedido_demissao",
            "justa_causa",
            "fim_contrato_determinado",
            "acordo_mutuo",
            "aposentadoria",
            "obito",
          ]),
          noticeType: z.enum(["trabalhado", "indenizado", "dispensado"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createTermination({
          ...input,
          noticeDate: toDate(input.noticeDate),
          lastWorkingDay: toDate(input.lastWorkingDay),
          initiatedById: ctx.user?.id,
        } as any);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z
            .enum([
              "INICIADO",
              "DOCUMENTOS",
              "DEVOLUCAO_EQUIP",
              "CALCULO_VERBAS",
              "APROVADO",
              "FINALIZADO",
              "CANCELADO",
            ])
            .optional(),
          totalVerbas: z.number().min(0).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data: any = { ...rest };
        if (rest.totalVerbas !== undefined) data.totalVerbas = String(rest.totalVerbas);
        return db.updateTermination(id, data);
      }),

    finalize: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const term = await db.getTermination(input.id);
        if (!term) throw new Error("Desligamento não encontrado");
        // Bloqueio progressivo: marca employee.status = Inativo
        await db.updateEmployee((term as any).employeeId, { status: "Inativo" } as any);
        return db.updateTermination(input.id, {
          status: "FINALIZADO" as any,
          finalizedAt: new Date(),
          approvedById: ctx.user?.id,
        } as any);
      }),

    completeDevolution: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          returned: z.boolean(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.updateTerminationDevolutionItem(input.id, {
          returned: input.returned,
          returnedAt: input.returned ? new Date() : null,
          notes: input.notes,
        } as any);
      }),
  }),
});
