import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, sql } from "drizzle-orm";
import {
  documentAuditLogs,
  documentLinks,
  documentTagLinks,
  documentTags,
  documents,
  documentVersions,
  storageCleanupJobs,
  type SystemModule,
} from "../../drizzle/schema";
import { checkPermission } from "../controle/permissionControl";
import { getDb } from "../db";
import {
  getStorageBackend,
  type StorageBackend,
  type StorageBackendName,
  type StoredFile,
} from "./document-storage";
import {
  lockDocumentForVersioning,
  normalizeTags,
  type FileInput,
  validateFile,
} from "./document-utils";

type PermissionAction = "canView" | "canCreate" | "canEdit" | "canDelete";

export type DocumentUserContext = {
  userId: number;
  userRole?: string;
  ipAddress: string;
  userAgent?: string;
};

export type CreateDocumentInput = {
  title: string;
  documentType: string;
  purpose: string;
  retentionPolicy: string;
  visibility: "private" | "internal" | "public";
  notes?: string;
  ownerUserId?: number;
  tags?: string[];
};

export type AddVersionInput = {
  documentId: string;
  changeNotes?: string;
};

export type ListDocumentsInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  documentType?: string;
  purpose?: string;
  status?: "ativo" | "arquivado";
  ownerUserId?: number;
};

export type UpdateDocumentInput = {
  documentId: string;
  title?: string;
  documentType?: string;
  purpose?: string;
  retentionPolicy?: string;
  visibility?: "private" | "internal" | "public";
  notes?: string;
  ownerUserId?: number;
  tags?: string[];
};

export type LinkEntityInput = {
  documentId: string;
  entityType: string;
  entityId: string;
  label?: string;
};

export type UnlinkEntityInput = {
  documentId: string;
  entityType: string;
  entityId: string;
};

type DownloadPayload = {
  documentId: string;
  versionId: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  storageBackend: StorageBackendName;
};

export class DocumentCommandService {
  constructor(
    private readonly storage: StorageBackend = getStorageBackend()
  ) {}

  async createDocumentWithInitialVersion(
    input: CreateDocumentInput,
    file: FileInput,
    context: DocumentUserContext
  ) {
    await this.requirePermission(context, "documents", "canCreate");
    validateFile(file);

    const db = await this.requireDb();
    const documentId = randomUUID();
    const versionId = randomUUID();
    const correlationId = randomUUID();
    const ownerUserId = this.resolveEffectiveOwnerUserId(input, context);
    const normalizedTags = normalizeTags(input.tags);
    const storedFile = await this.storeFileOrThrow(file, documentId, versionId);

    try {
      await db.transaction(async tx => {
        await tx.insert(documents).values({
          id: documentId,
          title: input.title,
          documentType: input.documentType,
          purpose: input.purpose,
          retentionPolicy: input.retentionPolicy,
          visibility: input.visibility,
          status: "ativo",
          ownerUserId,
          createdByUserId: context.userId,
          currentVersionId: versionId,
          latestVersionNumber: 1,
          storageBackend: storedFile.backend,
          notes: input.notes ?? null,
        });

        await tx.insert(documentVersions).values({
          id: versionId,
          documentId,
          versionNumber: 1,
          fileName: file.originalName,
          mimeType: file.mimeType,
          fileSize: file.size,
          storageKey: storedFile.storageKey,
          fileHash: storedFile.fileHash,
          uploadedByUserId: context.userId,
          changeNotes: "Versão inicial",
        });

        await this.attachTags(tx, documentId, normalizedTags);
        await this.insertAuditLog(tx, {
          documentId,
          action: "document_created",
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          correlationId,
          targetVersionId: versionId,
          metadata: {
            title: input.title,
            fileName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            fileHash: storedFile.fileHash,
            storageKey: storedFile.storageKey,
            backend: storedFile.backend,
          },
        });
      });

      return { documentId, versionId };
    } catch (error) {
      await this.compensateStorage(
        storedFile.storageKey,
        storedFile.backend,
        "create_document_db_failed"
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao registrar documento no banco de dados.",
        cause: error,
      });
    }
  }

  async addDocumentVersion(
    input: AddVersionInput,
    file: FileInput,
    context: DocumentUserContext
  ) {
    await this.requirePermission(context, "documents", "canEdit");
    validateFile(file);

    const db = await this.requireDb();
    const versionId = randomUUID();
    const correlationId = randomUUID();
    const storedFile = await this.storeFileOrThrow(
      file,
      input.documentId,
      versionId
    );

    try {
      await db.transaction(async tx => {
        const lockedDocument = await lockDocumentForVersioning(
          tx,
          input.documentId
        );

        if (!lockedDocument) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Documento não encontrado.",
          });
        }

        if (lockedDocument.status === "arquivado") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Documento arquivado não pode receber novas versões.",
          });
        }

        const nextVersionNumber = lockedDocument.latestVersionNumber + 1;

        await tx.insert(documentVersions).values({
          id: versionId,
          documentId: input.documentId,
          versionNumber: nextVersionNumber,
          fileName: file.originalName,
          mimeType: file.mimeType,
          fileSize: file.size,
          storageKey: storedFile.storageKey,
          fileHash: storedFile.fileHash,
          uploadedByUserId: context.userId,
          changeNotes: input.changeNotes ?? null,
        });

        await tx
          .update(documents)
          .set({
            currentVersionId: versionId,
            latestVersionNumber: nextVersionNumber,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, input.documentId));

        await this.insertAuditLog(tx, {
          documentId: input.documentId,
          action: "document_version_added",
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          correlationId,
          targetVersionId: versionId,
          metadata: {
            versionNumber: nextVersionNumber,
            fileName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            fileHash: storedFile.fileHash,
            storageKey: storedFile.storageKey,
            backend: storedFile.backend,
          },
        });
      });

      return { versionId };
    } catch (error) {
      await this.compensateStorage(
        storedFile.storageKey,
        storedFile.backend,
        "add_version_db_failed"
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao registrar nova versão.",
        cause: error,
      });
    }
  }

  async listDocuments(input: ListDocumentsInput, context: DocumentUserContext) {
    await this.requirePermission(context, "documents", "canView");
    const db = await this.requireDb();

    const page = Math.max(input.page ?? 1, 1);
    const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (input.documentType) {
      conditions.push(eq(documents.documentType, input.documentType));
    }
    if (input.purpose) {
      conditions.push(eq(documents.purpose, input.purpose));
    }
    if (input.status) {
      conditions.push(eq(documents.status, input.status));
    }
    if (input.ownerUserId) {
      conditions.push(eq(documents.ownerUserId, input.ownerUserId));
    }
    if (input.search?.trim()) {
      conditions.push(like(documents.title, `%${input.search.trim()}%`));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: documents.id,
        title: documents.title,
        documentType: documents.documentType,
        purpose: documents.purpose,
        retentionPolicy: documents.retentionPolicy,
        visibility: documents.visibility,
        status: documents.status,
        ownerUserId: documents.ownerUserId,
        currentVersionId: documents.currentVersionId,
        latestVersionNumber: documents.latestVersionNumber,
        storageBackend: documents.storageBackend,
        notes: documents.notes,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(whereClause)
      .orderBy(desc(documents.updatedAt), desc(documents.createdAt))
      .limit(pageSize)
      .offset(offset);

    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause);

    return {
      items: rows,
      page,
      pageSize,
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async getDocumentById(documentId: string, context: DocumentUserContext) {
    await this.requirePermission(context, "documents", "canView");
    const db = await this.requireDb();

    const [documentRow] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!documentRow) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Documento não encontrado.",
      });
    }

    const [versions, tagLinks, links, audits] = await Promise.all([
      db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.versionNumber)),
      db
        .select({
          id: documentTags.id,
          name: documentTags.name,
        })
        .from(documentTagLinks)
        .innerJoin(documentTags, eq(documentTags.id, documentTagLinks.tagId))
        .where(eq(documentTagLinks.documentId, documentId)),
      db
        .select()
        .from(documentLinks)
        .where(eq(documentLinks.documentId, documentId))
        .orderBy(desc(documentLinks.createdAt)),
      db
        .select()
        .from(documentAuditLogs)
        .where(eq(documentAuditLogs.documentId, documentId))
        .orderBy(desc(documentAuditLogs.createdAt)),
    ]);

    return {
      ...documentRow,
      versions,
      tags: tagLinks,
      links,
      audits: audits.map(audit => ({
        ...audit,
        metadata: audit.metadata ? JSON.parse(audit.metadata) : null,
      })),
    };
  }

  async updateDocumentMetadata(
    input: UpdateDocumentInput,
    context: DocumentUserContext
  ) {
    await this.requirePermission(context, "documents", "canEdit");
    const db = await this.requireDb();

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, input.documentId))
      .limit(1);

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Documento não encontrado.",
      });
    }

    const nextOwnerUserId =
      input.ownerUserId !== undefined
        ? this.resolveEffectiveOwnerUserId(
            { ownerUserId: input.ownerUserId },
            context
          )
        : existing.ownerUserId;
    const normalizedTags = input.tags ? normalizeTags(input.tags) : undefined;
    const correlationId = randomUUID();

    await db.transaction(async tx => {
      await tx
        .update(documents)
        .set({
          title: input.title ?? existing.title,
          documentType: input.documentType ?? existing.documentType,
          purpose: input.purpose ?? existing.purpose,
          retentionPolicy: input.retentionPolicy ?? existing.retentionPolicy,
          visibility: input.visibility ?? existing.visibility,
          notes: input.notes ?? existing.notes,
          ownerUserId: nextOwnerUserId,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId));

      if (normalizedTags) {
        await tx
          .delete(documentTagLinks)
          .where(eq(documentTagLinks.documentId, input.documentId));
        await this.attachTags(tx, input.documentId, normalizedTags);
      }

      await this.insertAuditLog(tx, {
        documentId: input.documentId,
        action: "document_metadata_updated",
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        correlationId,
        targetVersionId: existing.currentVersionId ?? null,
        metadata: {
          title: input.title ?? existing.title,
          documentType: input.documentType ?? existing.documentType,
          purpose: input.purpose ?? existing.purpose,
          retentionPolicy: input.retentionPolicy ?? existing.retentionPolicy,
          visibility: input.visibility ?? existing.visibility,
          ownerUserId: nextOwnerUserId,
          tags: normalizedTags,
        },
      });
    });

    return { success: true };
  }

  async setDocumentArchivedState(
    documentId: string,
    archived: boolean,
    context: DocumentUserContext
  ) {
    await this.requirePermission(context, "documents", "canEdit");
    const db = await this.requireDb();

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Documento não encontrado.",
      });
    }

    const status = archived ? "arquivado" : "ativo";
    const correlationId = randomUUID();

    await db.transaction(async tx => {
      await tx
        .update(documents)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      await this.insertAuditLog(tx, {
        documentId,
        action: archived ? "document_archived" : "document_restored",
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        correlationId,
        targetVersionId: existing.currentVersionId ?? null,
        metadata: {
          status,
        },
      });
    });

    return { success: true };
  }

  async createDownloadTokenData(
    documentId: string,
    context: DocumentUserContext
  ): Promise<DownloadPayload> {
    await this.requirePermission(context, "documents", "canView");
    const db = await this.requireDb();

    const rows = await db
      .select({
        documentId: documents.id,
        versionId: documentVersions.id,
        fileName: documentVersions.fileName,
        mimeType: documentVersions.mimeType,
        storageKey: documentVersions.storageKey,
        storageBackend: documents.storageBackend,
      })
      .from(documents)
      .innerJoin(
        documentVersions,
        eq(documentVersions.id, documents.currentVersionId)
      )
      .where(eq(documents.id, documentId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Documento não encontrado.",
      });
    }

    await this.insertAuditLog(db, {
      documentId,
      action: "document_downloaded",
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: randomUUID(),
      targetVersionId: row.versionId,
      metadata: {
        fileName: row.fileName,
        mimeType: row.mimeType,
        storageKey: row.storageKey,
        backend: row.storageBackend,
      },
    });

    return row;
  }

  async linkEntity(input: LinkEntityInput, context: DocumentUserContext) {
    await this.requirePermission(context, "documents", "canEdit");
    const db = await this.requireDb();

    const [documentRow] = await db
      .select({
        id: documents.id,
        status: documents.status,
      })
      .from(documents)
      .where(eq(documents.id, input.documentId))
      .limit(1);

    if (!documentRow) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Documento não encontrado.",
      });
    }

    if (documentRow.status === "arquivado") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Documento arquivado não pode ser vinculado.",
      });
    }

    const linkId = randomUUID();
    const correlationId = randomUUID();

    try {
      await db.transaction(async tx => {
        await tx.insert(documentLinks).values({
          id: linkId,
          documentId: input.documentId,
          entityType: input.entityType,
          entityId: input.entityId,
          label: input.label ?? null,
          createdByUserId: context.userId,
        });

        await this.insertAuditLog(tx, {
          documentId: input.documentId,
          action: "document_linked",
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          correlationId,
          targetVersionId: null,
          metadata: {
            entityType: input.entityType,
            entityId: input.entityId,
            label: input.label ?? null,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Duplicate entry") ||
          error.message.includes("uniq_document_link"))
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Documento já está vinculado a esta entidade.",
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao vincular documento.",
        cause: error,
      });
    }

    return { linkId };
  }

  async unlinkEntity(input: UnlinkEntityInput, context: DocumentUserContext) {
    await this.requirePermission(context, "documents", "canEdit");
    const db = await this.requireDb();
    const correlationId = randomUUID();

    await db.transaction(async tx => {
      const [existingLink] = await tx
        .select({ id: documentLinks.id })
        .from(documentLinks)
        .where(
          and(
            eq(documentLinks.documentId, input.documentId),
            eq(documentLinks.entityType, input.entityType),
            eq(documentLinks.entityId, input.entityId)
          )
        )
        .limit(1);

      if (!existingLink) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vínculo não encontrado.",
        });
      }

      await tx
        .delete(documentLinks)
        .where(eq(documentLinks.id, existingLink.id));

      await this.insertAuditLog(tx, {
        documentId: input.documentId,
        action: "document_unlinked",
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        correlationId,
        targetVersionId: null,
        metadata: {
          entityType: input.entityType,
          entityId: input.entityId,
        },
      });
    });

    return { success: true };
  }

  async listDocumentsByEntity(
    entityType: string,
    entityId: string,
    context: DocumentUserContext
  ) {
    await this.requirePermission(context, "documents", "canView");
    const db = await this.requireDb();

    return db
      .select({
        linkId: documentLinks.id,
        label: documentLinks.label,
        createdAt: documentLinks.createdAt,
        documentId: documents.id,
        title: documents.title,
        documentType: documents.documentType,
        status: documents.status,
        visibility: documents.visibility,
        currentVersionId: documents.currentVersionId,
        latestVersionNumber: documents.latestVersionNumber,
        fileName: documentVersions.fileName,
        mimeType: documentVersions.mimeType,
        fileSize: documentVersions.fileSize,
      })
      .from(documentLinks)
      .innerJoin(documents, eq(documents.id, documentLinks.documentId))
      .leftJoin(
        documentVersions,
        eq(documentVersions.id, documents.currentVersionId)
      )
      .where(
        and(
          eq(documentLinks.entityType, entityType),
          eq(documentLinks.entityId, entityId)
        )
      )
      .orderBy(desc(documentLinks.createdAt));
  }

  private async storeFileOrThrow(
    file: FileInput,
    documentId: string,
    versionId: string
  ): Promise<StoredFile> {
    try {
      return await this.storage.save(file.buffer, {
        documentId,
        versionId,
        originalName: file.originalName,
        mimeType: file.mimeType,
      });
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao armazenar o arquivo.",
        cause: error,
      });
    }
  }

  private async compensateStorage(
    storageKey: string,
    backend: StorageBackendName,
    reason: string
  ) {
    try {
      await getStorageBackend(backend).delete(storageKey);
    } catch (error) {
      const db = await getDb();
      if (!db) {
        throw error;
      }

      await db.insert(storageCleanupJobs).values({
        id: randomUUID(),
        storageKey,
        backend,
        status: "pending",
        reason,
        lastError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async attachTags(tx: any, documentId: string, tags: string[]) {
    for (const tagName of tags) {
      const existing = await tx
        .select({ id: documentTags.id })
        .from(documentTags)
        .where(eq(documentTags.name, tagName))
        .limit(1);

      const tagId = existing[0]?.id ?? randomUUID();

      if (!existing[0]) {
        await tx.insert(documentTags).values({
          id: tagId,
          name: tagName,
        });
      }

      await tx.insert(documentTagLinks).values({
        documentId,
        tagId,
      });
    }
  }

  private async insertAuditLog(
    executor: any,
    input: {
      documentId: string;
      action: string;
      userId: number;
      ipAddress: string;
      userAgent?: string;
      correlationId: string;
      targetVersionId?: string | null;
      metadata: Record<string, unknown>;
    }
  ) {
    await executor.insert(documentAuditLogs).values({
      id: randomUUID(),
      documentId: input.documentId,
      targetVersionId: input.targetVersionId ?? null,
      action: input.action,
      userId: input.userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent ?? null,
      correlationId: input.correlationId,
      metadata: JSON.stringify(input.metadata),
    });
  }

  private async requireDb() {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Banco de dados indisponível.",
      });
    }

    return db;
  }

  private async requirePermission(
    context: DocumentUserContext,
    module: SystemModule,
    action: PermissionAction
  ) {
    if (context.userRole === "admin") return;

    const allowed = await checkPermission(context.userId, module, action);
    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Sem permissão para ${action} em ${module}.`,
      });
    }
  }

  private resolveEffectiveOwnerUserId(
    input: { ownerUserId?: number },
    context: DocumentUserContext
  ) {
    if (!input.ownerUserId || input.ownerUserId === context.userId) {
      return context.userId;
    }

    if (context.userRole !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Você não tem permissão para criar documentos em nome de outro usuário.",
      });
    }

    return input.ownerUserId;
  }
}
