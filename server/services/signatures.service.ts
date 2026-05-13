import type { DocumentSignature, InsertDocumentSignature } from "../../drizzle/schema.js";

export async function addSignature(data: InsertDocumentSignature) {
  return data;
}

export async function getSignatures(
  documentId: number
): Promise<DocumentSignature[]> {
  void documentId;
  return [];
}

export async function isFullySigned(
  documentId: number,
  policy: "none" | "employee_required" | "both_required"
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
