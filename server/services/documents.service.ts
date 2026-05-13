import { and, eq, sql } from "drizzle-orm";
import type { Document, InsertDocument } from "../../drizzle/schema.js";
import { documents } from "../../drizzle/schema.js";
import { getDb } from "../db.js";

export type DocumentLifecycleStatus = "draft" | "stored" | "archived";
type DocumentExecutor = any;

async function getDocumentById(documentId: number, executor?: DocumentExecutor) {
  const db = executor ?? (await getDb());
  if (!db) throw new Error("DB not available");

  return db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .then((rows: any[]) => rows[0] ?? null);
}

async function lockChecklistDocuments(
  executor: DocumentExecutor,
  admissionChecklistItemId: number
) {
  await executor.execute(
    sql`SELECT id FROM documents WHERE admission_checklist_item_id = ${admissionChecklistItemId} FOR UPDATE`
  );
}

async function setPrimaryEvidenceInTx(
  executor: DocumentExecutor,
  documentId: number,
  admissionChecklistItemId: number
) {
  await lockChecklistDocuments(executor, admissionChecklistItemId);

  await executor
    .update(documents)
    .set({ isPrimaryEvidence: false })
    .where(eq(documents.admissionChecklistItemId, admissionChecklistItemId));

  await executor
    .update(documents)
    .set({ isPrimaryEvidence: true })
    .where(eq(documents.id, documentId));
}

export async function createDocumentRecord(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  return db.transaction(async (tx) => {
    const result = await tx.insert(documents).values(data);
    const documentId = Number(result[0].insertId);

    const created = await getDocumentById(documentId, tx);
    if (!created) {
      throw new Error("Document could not be loaded after creation");
    }

    if (created.admissionChecklistItemId) {
      const existingPrimary = await tx
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.admissionChecklistItemId, created.admissionChecklistItemId),
            eq(documents.isPrimaryEvidence, true)
          )
        )
        .then((rows: any[]) => rows[0] ?? null);

      if (!existingPrimary) {
        await setPrimaryEvidenceInTx(
          tx,
          created.id,
          created.admissionChecklistItemId
        );
        return getDocumentById(created.id, tx);
      }
    }

    return created;
  });
}

export async function setPrimaryEvidence(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  return db.transaction(async (tx) => {
    const target = await getDocumentById(documentId, tx);
    if (!target) {
      throw new Error("Document not found");
    }
    if (!target.admissionChecklistItemId) {
      throw new Error("Document is not linked to an admission checklist item");
    }

    await setPrimaryEvidenceInTx(tx, documentId, target.admissionChecklistItemId);
    return getDocumentById(documentId, tx);
  });
}

export async function getPrimaryEvidence(
  admissionChecklistItemId: number
): Promise<Document | null> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.admissionChecklistItemId, admissionChecklistItemId),
        eq(documents.isPrimaryEvidence, true)
      )
    )
    .then((rows: any[]) => rows[0] ?? null);
}

export async function updateLifecycleStatus(
  documentId: number,
  lifecycleStatus: DocumentLifecycleStatus
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db
    .update(documents)
    .set({ lifecycleStatus })
    .where(eq(documents.id, documentId));

  return getDocumentById(documentId, db);
}
