import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import * as db from "../db.js";

const stageEnum = z.enum([
  "Triagem",
  "Entrevista RH",
  "Entrevista Tecnica",
  "Entrevista Final",
  "Aprovado",
  "Reprovado",
  "Desistiu",
]);

export const recruitmentRouter = router({
  jobOpenings: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => db.listJobOpenings(input?.status)),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => db.getJobOpening(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(2).max(255),
          department: z.string().max(100).optional(),
          positionId: z.number().int().positive().optional(),
          description: z.string().max(20000).optional(),
          requirements: z.string().max(5000).optional(),
          salaryMin: z.number().min(0).optional(),
          salaryMax: z.number().min(0).optional(),
          vacancies: z.number().int().min(1).default(1),
          priority: z.enum(["Baixa", "Normal", "Alta", "Urgente"]).default("Normal"),
        })
      )
      .mutation(async ({ input }) => {
        const data: any = { ...input };
        if (data.salaryMin !== undefined) data.salaryMin = String(data.salaryMin);
        if (data.salaryMax !== undefined) data.salaryMax = String(data.salaryMax);
        return db.createJobOpening(data);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().min(2).max(255).optional(),
          description: z.string().max(20000).optional(),
          requirements: z.string().max(5000).optional(),
          status: z.enum(["Aberta", "Em Andamento", "Fechada", "Cancelada"]).optional(),
          priority: z.enum(["Baixa", "Normal", "Alta", "Urgente"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await db.updateJobOpening(id, rest as any);
        return { success: true };
      }),
  }),

  candidates: router({
    list: protectedProcedure
      .input(z.object({ jobOpeningId: z.number().int().positive().optional() }).optional())
      .query(async ({ input }) => db.listCandidates(input?.jobOpeningId)),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => db.getCandidate(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          jobOpeningId: z.number().int().positive(),
          name: z.string().min(2).max(255),
          email: z.string().email().max(255).optional(),
          phone: z.string().max(20).optional(),
          resumeUrl: z.string().max(500).optional(),
          linkedinUrl: z.string().max(500).optional(),
          notes: z.string().max(20000).optional(),
          rating: z.number().int().min(0).max(5).optional(),
          stage: stageEnum.optional(),
        })
      )
      .mutation(async ({ input }) => db.createCandidate(input as any)),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          stage: stageEnum.optional(),
          notes: z.string().max(20000).optional(),
          rating: z.number().int().min(0).max(5).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await db.updateCandidate(id, rest as any);
        return { success: true };
      }),
  }),
});
