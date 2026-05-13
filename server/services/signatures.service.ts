import { and, eq } from "drizzle-orm";
import type {
  DocumentSignature,
  InsertDocumentSignature,
} from "../../drizzle/schema.js";
import { documentSignatures } from "../../drizzle/schema.js";
import { getDb } from "../db.js";

export type SignaturePolicy = "none" | "employee_required" | "both_required";
export type SignatoryType = "employee" | "company_representative";

export async function addSignature(
  data: InsertDocumentSignature
): Promise<DocumentSignature> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const existing = await db
    .select()
    .from(documentSignatures)
    .where(
      and(
        eq(documentSignatures.documentId, data.documentId),
        eq(documentSignatures.signatoryType, data.signatoryType)
      )
    )
    .then((rows) => rows[0] ?? null);

  if (existing) {
    throw new Error(
      `Document already signed by ${data.signatoryType} on ${existing.signedAt?.toISOString?.() ?? existing.signedAt}`
    );
  }

  const [result] = await db.insert(documentSignatures).values(data);
  const insertId = Number((result as any).insertId);

  const inserted = await db
    .select()
    .from(documentSignatures)
    .where(eq(documentSignatures.id, insertId))
    .then((rows) => rows[0] ?? null);

  if (!inserted) throw new Error("Signature could not be loaded after insert");
  return inserted;
}

export async function getSignatures(
  documentId: number
): Promise<DocumentSignature[]> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  return db
    .select()
    .from(documentSignatures)
    .where(eq(documentSignatures.documentId, documentId));
}

export async function isFullySigned(
  documentId: number,
  policy: SignaturePolicy
) {
  if (policy === "none") return true;
  const signatures = await getSignatures(documentId);
  const hasEmployee = signatures.some(
    (signature) => signature.signatoryType === "employee"
  );
  const hasCompany = signatures.some(
    (signature) => signature.signatoryType === "company_representative"
  );

  if (policy === "employee_required") return hasEmployee;
  return hasEmployee && hasCompany;
}
