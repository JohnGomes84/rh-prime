import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc.js";
import * as db from "../db.js";
import { isFeatureEnabled } from "../_core/feature-flags.js";
import {
  instantiateCatalogForWorkflow,
  listChecklistWithEvidence,
  persistComputedStatus,
  reviewChecklistItem,
  syncMirror,
  validateFinalizationGates,
  waiveChecklistItem,
} from "../services/admission-checklist.service.js";
import { TRPCError } from "@trpc/server";
import { createDocumentRecord, getPrimaryEvidence } from "../services/documents.service.js";
import { addSignature } from "../services/signatures.service.js";
import { renderTemplate } from "../services/template-render.service.js";
import { getAdmissionCatalog } from "../config/admission-catalog.js";
import { put } from "@vercel/blob";
import { toDate, toDateOpt } from "../utils/type-converters.js";

const ADMISSION_CATEGORY_MAP: Record<string, "Pessoal" | "Contratual" | "Saúde e Segurança" | "Benefícios" | "Termos" | "Treinamentos" | "Outros"> = {
  documentacao_pessoal: "Pessoal",
  documentacao_trabalhista: "Contratual",
  beneficios: "Benefícios",
  saude_seguranca: "Saúde e Segurança",
  termos: "Termos",
  treinamentos: "Treinamentos",
};

function mapAdmissionCategory(itemCategory: string) {
  return ADMISSION_CATEGORY_MAP[itemCategory] ?? "Outros";
}

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

    attachEvidenceUrl: adminProcedure
      .input(
        z.object({
          workflowId: z.number().int().positive(),
          itemId: z.number().int().positive(),
          fileUrl: z.string().url().max(500),
          documentName: z.string().min(1).max(255),
          fileType: z.string().max(10).optional(),
          observations: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        assertAdmissionV2Enabled();
        const workflow = await db.getAdmissionWorkflow(input.workflowId);
        if (!workflow) throw new Error("Admission workflow not found");

        const checklist = await listChecklistWithEvidence(input.workflowId);
        const item = checklist.find((entry) => entry.id === input.itemId);
        if (!item) throw new Error("Checklist item not found");

        const result = await createDocumentRecord({
          employeeId: workflow.resultEmployeeId ?? 0,
          cpf: workflow.candidateCpf ?? "",
          category: mapAdmissionCategory(item.category),
          documentName: input.documentName,
          fileUrl: input.fileUrl,
          fileType: input.fileType ?? null,
          origin: "external_url",
          admissionWorkflowId: input.workflowId,
          admissionChecklistItemId: input.itemId,
          isPrimaryEvidence: true,
          observations: input.observations ?? null,
        } as any);

        // Recomputa status do item apos anexar evidencia (AWAITING_EVIDENCE -> COMPLETED se sem signature)
        const refreshed = await listChecklistWithEvidence(input.workflowId);
        const refreshedItem = refreshed.find((entry) => entry.id === input.itemId);
        if (refreshedItem) {
          await persistComputedStatus(refreshedItem);
        }

        return result;
      }),

    generateDocument: adminProcedure
      .input(
        z.object({
          workflowId: z.number().int().positive(),
          itemId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ input }) => {
        assertAdmissionV2Enabled();
        const workflow = await db.getAdmissionWorkflow(input.workflowId);
        if (!workflow) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow nao encontrado" });

        const checklist = await listChecklistWithEvidence(input.workflowId);
        const item = checklist.find((entry) => entry.id === input.itemId);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item nao encontrado" });

        const catalog = getAdmissionCatalog(workflow.catalogVersion ?? undefined);
        const catalogItem = catalog.find((c) => c.code === item.code);
        if (!catalogItem?.templateKey) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Item nao possui template associado" });
        }

        const { html, templateName } = await renderTemplate(catalogItem.templateKey, workflow as any);

        const safeName = templateName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
        const pathname = `admission/generated/${Date.now()}-${safeName}.html`;
        const blob = await put(pathname, html, {
          access: "private",
          contentType: "text/html; charset=utf-8",
          addRandomSuffix: false,
        });

        const result = await createDocumentRecord({
          employeeId: workflow.resultEmployeeId ?? 0,
          cpf: workflow.candidateCpf ?? "",
          category: mapAdmissionCategory(item.category),
          documentName: `${templateName}.html`,
          fileUrl: blob.url,
          fileType: "html",
          origin: "generated",
          admissionWorkflowId: input.workflowId,
          admissionChecklistItemId: input.itemId,
          isPrimaryEvidence: true,
          observations: `Gerado automaticamente a partir do template ${catalogItem.templateKey}`,
        } as any);

        const refreshed = await listChecklistWithEvidence(input.workflowId);
        const refreshedItem = refreshed.find((entry) => entry.id === input.itemId);
        if (refreshedItem) await persistComputedStatus(refreshedItem);

        return result;
      }),

    signEvidence: adminProcedure
      .input(
        z.object({
          workflowId: z.number().int().positive(),
          itemId: z.number().int().positive(),
          signatoryType: z.enum(["employee", "company_representative"]),
          signatureMethod: z.enum(["electronic", "manuscrita", "icp_brasil"]).default("electronic"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        assertAdmissionV2Enabled();
        const primary = await getPrimaryEvidence(input.itemId);
        if (!primary) {
          throw new Error("Anexe a evidência principal antes de assinar");
        }

        const signatoryId = ctx.user?.id;
        if (!signatoryId) throw new Error("Signatário não identificado");

        const ip = (ctx as any)?.req?.ip ?? null;
        const sig = await addSignature({
          documentId: primary.id,
          signatoryType: input.signatoryType,
          signatoryId,
          signatureMethod: input.signatureMethod,
          ipAddress: ip,
        } as any);

        // Recomputa status do item apos assinar (AWAITING_SIGNATURE -> COMPLETED se completou both_required)
        const refreshed = await listChecklistWithEvidence(input.workflowId);
        const refreshedItem = refreshed.find((entry) => entry.id === input.itemId);
        if (refreshedItem) {
          await persistComputedStatus(refreshedItem);
        }

        return sig;
      }),

    finalize: adminProcedure
      .input(z.object({ id: z.number().int().positive(), employeeId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const workflow = await db.getAdmissionWorkflow(input.id);
        if (!workflow) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workflow não encontrado" });
        }

        const useAdmissionV2 = Boolean((workflow as any).catalogVersion);
        if (useAdmissionV2) {
          const gates = await validateFinalizationGates(input.id);
          if (!gates.passed) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: gates.failures.join("\n"),
              cause: { failures: gates.failures },
            });
          }
        }

        const updated = await db.updateAdmissionWorkflow(input.id, {
          status: "ACTIVE" as any,
          resultEmployeeId: input.employeeId,
          completedAt: new Date(),
        } as any);

        if (useAdmissionV2) {
          try {
            await syncMirror(input.id);
          } catch (err) {
            await db.updateAdmissionWorkflow(input.id, {
              syncStatus: "SYNC_ERROR" as any,
            } as any);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Finalizado, mas sync mirror falhou: ${(err as Error).message}. Use retrySync.`,
            });
          }
        }

        return updated;
      }),

    retryFinalizationSync: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        assertAdmissionV2Enabled();
        try {
          return await syncMirror(input.id);
        } catch (err) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: (err as Error).message,
          });
        }
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
