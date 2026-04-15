import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { DocumentCommandService } from "../lib/document-command-service";

const listDocumentsSchema = z
  .object({
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
    documentType: z.string().trim().optional(),
    purpose: z.string().trim().optional(),
    status: z.enum(["ativo", "arquivado"]).optional(),
    ownerUserId: z.number().int().positive().optional(),
  })
  .optional()
  .default({});

const updateDocumentSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().trim().min(1).max(255).optional(),
  documentType: z.string().trim().min(1).max(50).optional(),
  purpose: z.string().trim().min(1).max(50).optional(),
  retentionPolicy: z.string().trim().min(1).max(30).optional(),
  visibility: z.enum(["private", "internal", "public"]).optional(),
  notes: z.string().max(5000).optional(),
  ownerUserId: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

const listByEntitySchema = z.object({
  entityType: z.string().trim().min(1).max(50),
  entityId: z.string().trim().min(1).max(50),
});

const linkEntitySchema = z.object({
  documentId: z.string().uuid(),
  entityType: z.string().trim().min(1).max(50),
  entityId: z.string().trim().min(1).max(50),
  label: z.string().trim().max(100).optional(),
});

const unlinkEntitySchema = z.object({
  documentId: z.string().uuid(),
  entityType: z.string().trim().min(1).max(50),
  entityId: z.string().trim().min(1).max(50),
});

function toUserContext(ctx: {
  user: { id: number; role?: string };
  req: { ip?: string; headers: Record<string, string | string[] | undefined> };
}) {
  return {
    userId: ctx.user.id,
    userRole: ctx.user.role,
    ipAddress: ctx.req.ip || "0.0.0.0",
    userAgent:
      typeof ctx.req.headers["user-agent"] === "string"
        ? ctx.req.headers["user-agent"]
        : undefined,
  };
}

export const documentsRouter = router({
  list: protectedProcedure
    .input(listDocumentsSchema)
    .query(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      return service.listDocuments(input ?? {}, toUserContext(ctx));
    }),

  getById: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      return service.getDocumentById(input, toUserContext(ctx));
    }),

  update: protectedProcedure
    .input(updateDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      return service.updateDocumentMetadata(input, toUserContext(ctx));
    }),

  archive: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      return service.setDocumentArchivedState(input, true, toUserContext(ctx));
    }),

  restore: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      return service.setDocumentArchivedState(input, false, toUserContext(ctx));
    }),

  download: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      const payload = await service.createDownloadTokenData(
        input,
        toUserContext(ctx)
      );

      return {
        ...payload,
        url: `/api/documents/${input}/download`,
      };
    }),

  linkEntity: protectedProcedure
    .input(linkEntitySchema)
    .mutation(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      return service.linkEntity(input, toUserContext(ctx));
    }),

  unlinkEntity: protectedProcedure
    .input(unlinkEntitySchema)
    .mutation(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      return service.unlinkEntity(input, toUserContext(ctx));
    }),

  listByEntity: protectedProcedure
    .input(listByEntitySchema)
    .query(async ({ ctx, input }) => {
      const service = new DocumentCommandService();
      return service.listDocumentsByEntity(
        input.entityType,
        input.entityId,
        toUserContext(ctx)
      );
    }),
});
