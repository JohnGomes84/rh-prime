import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";
import { toDate, toDateOpt } from "../utils/type-converters";

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
        const data: any = {
          ...input,
          proposedSalary: input.proposedSalary !== undefined ? String(input.proposedSalary) : undefined,
          proposedHireDate: toDateOpt(input.proposedHireDate),
          createdById: ctx.user?.id,
        };
        return db.createAdmissionWorkflow(data);
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
