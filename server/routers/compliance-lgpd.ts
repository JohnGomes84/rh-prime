import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";

const CONSENT_TYPES = [
  "data_processing",
  "selfie_capture",
  "geo_capture",
  "marketing_communications",
  "internal_policies",
  "biometric",
  "third_party_share",
] as const;

const LEGAL_BASIS = [
  "consentimento",
  "execucao_contrato",
  "obrigacao_legal",
  "interesse_legitimo",
  "protecao_credito",
  "tutela_saude",
] as const;

export const lgpdRouter = router({
  myConsents: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    return db.listUserConsents(ctx.user.id);
  }),

  hasActiveConsent: protectedProcedure
    .input(z.object({ consentType: z.enum(CONSENT_TYPES) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) return { hasConsent: false };
      const c = await db.getActiveConsent(ctx.user.id, input.consentType);
      return { hasConsent: !!c?.accepted, record: c };
    }),

  accept: protectedProcedure
    .input(
      z.object({
        consentType: z.enum(CONSENT_TYPES),
        version: z.string().max(20).default("v1"),
        legalBasis: z.enum(LEGAL_BASIS).default("consentimento"),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Login necessário");
      const ipAddress = (ctx.req?.ip || (ctx.req as any)?.socket?.remoteAddress || null) as string | null;
      const userAgent = (ctx.req?.headers?.["user-agent"] as string | undefined) ?? null;
      const ownEmp = await db.getEmployeeForUser(ctx.user.id, ctx.user.email).catch(() => null);
      return db.recordConsent({
        userId: ctx.user.id,
        employeeId: (ownEmp as any)?.id ?? null,
        consentType: input.consentType,
        version: input.version,
        legalBasis: input.legalBasis,
        accepted: true,
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
        notes: input.notes,
      } as any);
    }),

  revoke: protectedProcedure
    .input(z.object({ consentType: z.enum(CONSENT_TYPES) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Login necessário");
      return db.revokeConsent(ctx.user.id, input.consentType);
    }),

  // Admin: ver logs de leitura sensível
  readAuditLogs: adminProcedure
    .input(
      z
        .object({
          actorUserId: z.number().int().positive().optional(),
          targetEmployeeId: z.number().int().positive().optional(),
          resource: z.string().max(80).optional(),
          limit: z.number().int().min(1).max(1000).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => db.listReadAuditLogs(input)),
});
