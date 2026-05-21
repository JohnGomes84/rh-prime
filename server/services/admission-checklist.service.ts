import { and, eq } from "drizzle-orm";
import type {
  AdmissionChecklistItem,
  AdmissionWorkflow,
  Document,
  DocumentSignature,
  InsertAdmissionChecklistItem,
  InsertChecklistItem,
} from "../../drizzle/schema.js";
import {
  admissionChecklistItems,
  admissionWorkflows,
  checklistItems,
  documents,
  documentSignatures,
} from "../../drizzle/schema.js";
import {
  CURRENT_CATALOG_VERSION,
  getAdmissionCatalog,
} from "../config/admission-catalog.js";
import { getDb } from "../db.js";

export type AdmissionChecklistStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "AWAITING_EVIDENCE"
  | "AWAITING_SIGNATURE"
  | "UNDER_REVIEW"
  | "COMPLETED"
  | "WAIVED"
  | "REJECTED"
  | "ERROR";

export interface FinalizationGateResult {
  passed: boolean;
  failures: string[];
}

export interface AdmissionChecklistWithEvidence extends AdmissionChecklistItem {
  evidenceDocuments: Document[];
  primaryEvidence: Document | null;
  signatures: DocumentSignature[];
}

function isDocumentRequirementSatisfied(
  item: AdmissionChecklistItem,
  primaryEvidence: Document | null
) {
  if (item.documentPolicy === "required_single") {
    return Boolean(primaryEvidence);
  }
  return true;
}

function isSignatureRequirementSatisfied(
  item: AdmissionChecklistItem,
  signatures: DocumentSignature[]
) {
  if (item.signaturePolicy === "none") return true;

  const hasEmployee = signatures.some(
    (signature) => signature.signatoryType === "employee"
  );
  const hasCompany = signatures.some(
    (signature) => signature.signatoryType === "company_representative"
  );

  if (item.signaturePolicy === "employee_required") return hasEmployee;
  if (item.signaturePolicy === "both_required") return hasEmployee && hasCompany;
  return false;
}

function isReviewRequirementSatisfied(item: AdmissionChecklistItem) {
  if (item.reviewPolicy === "manual_review") {
    return item.reviewStatus === "approved";
  }
  return item.reviewStatus !== "rejected";
}

export async function instantiateCatalogForWorkflow(
  workflowId: number,
  catalogVersion = CURRENT_CATALOG_VERSION
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const catalog = getAdmissionCatalog(catalogVersion);
  const rows: InsertAdmissionChecklistItem[] = catalog.map((item) => ({
    workflowId,
    code: item.code,
    category: item.category,
    itemDescription: item.title,
    kind: item.kind,
    status:
      item.documentPolicy === "required_single"
        ? "AWAITING_EVIDENCE"
        : "PENDING",
    documentPolicy: item.documentPolicy,
    templatePolicy: item.templatePolicy,
    templateKey: item.templateKey,
    signaturePolicy: item.signaturePolicy,
    reviewPolicy: item.reviewPolicy,
    required: item.required,
    completed: false,
  }));

  await db.insert(admissionChecklistItems).values(rows);

  return db
    .select()
    .from(admissionChecklistItems)
    .where(eq(admissionChecklistItems.workflowId, workflowId));
}

export function recomputeItemStatus(
  item: AdmissionChecklistItem,
  primaryEvidence: Document | null,
  signatures: DocumentSignature[]
): AdmissionChecklistStatus {
  if (item.status === "WAIVED") return "WAIVED";

  if (item.reviewStatus === "rejected") return "REJECTED";

  if (item.kind === "manual_validation") {
    if (item.reviewStatus === "approved") return "COMPLETED";
    if (item.reviewStatus === "pending") return "UNDER_REVIEW";
    return "PENDING";
  }

  if (item.kind === "external_process") {
    if (item.completed) return "COMPLETED";
    return "IN_PROGRESS";
  }

  if (!isDocumentRequirementSatisfied(item, primaryEvidence)) {
    return "AWAITING_EVIDENCE";
  }

  if (
    item.reviewPolicy === "manual_review" &&
    item.reviewStatus !== "approved"
  ) {
    return item.reviewStatus === "pending"
      ? "UNDER_REVIEW"
      : "AWAITING_EVIDENCE";
  }

  if (!isSignatureRequirementSatisfied(item, signatures)) {
    return "AWAITING_SIGNATURE";
  }

  if (
    item.kind === "training_or_ack" &&
    item.reviewPolicy === "auto_complete" &&
    !item.completed &&
    !primaryEvidence
  ) {
    return "IN_PROGRESS";
  }

  return "COMPLETED";
}

async function getChecklistDocuments(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select()
    .from(documents)
    .where(eq(documents.admissionChecklistItemId, itemId));
}

async function getDocumentSignaturesForDocument(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select()
    .from(documentSignatures)
    .where(eq(documentSignatures.documentId, documentId));
}

export async function listChecklistWithEvidence(
  workflowId: number
): Promise<AdmissionChecklistWithEvidence[]> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const items = await db
    .select()
    .from(admissionChecklistItems)
    .where(eq(admissionChecklistItems.workflowId, workflowId));

  const enriched = await Promise.all(
    items.map(async (item) => {
      const evidenceDocuments = await getChecklistDocuments(item.id);
      const primaryEvidence =
        evidenceDocuments.find((doc) => doc.isPrimaryEvidence) ?? null;
      const signatures = primaryEvidence
        ? await getDocumentSignaturesForDocument(primaryEvidence.id)
        : [];

      return {
        ...item,
        evidenceDocuments,
        primaryEvidence,
        signatures,
      };
    })
  );

  return enriched;
}

export async function persistComputedStatus(item: AdmissionChecklistWithEvidence) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const status = recomputeItemStatus(item, item.primaryEvidence, item.signatures);
  const completedAt =
    status === "COMPLETED" ? item.completedAt ?? new Date() : null;

  await db
    .update(admissionChecklistItems)
    .set({
      status,
      completed: status === "COMPLETED",
      completedAt,
    })
    .where(eq(admissionChecklistItems.id, item.id));

  return status;
}

export async function validateFinalizationGates(
  workflowId: number
): Promise<FinalizationGateResult> {
  const workflow = await getWorkflowOrThrow(workflowId);
  const items = await listChecklistWithEvidence(workflowId);
  const failures: string[] = [];

  for (const item of items) {
    const status = recomputeItemStatus(item, item.primaryEvidence, item.signatures);

    if (item.required && status !== "COMPLETED" && status !== "WAIVED") {
      failures.push(
        `${item.code ?? item.itemDescription}: required item is not completed`
      );
    }

    if (
      item.required &&
      item.documentPolicy === "required_single" &&
      !item.primaryEvidence
    ) {
      failures.push(
        `${item.code ?? item.itemDescription}: missing primary evidence`
      );
    }

    if (!isSignatureRequirementSatisfied(item, item.signatures)) {
      failures.push(
        `${item.code ?? item.itemDescription}: signature requirement not satisfied`
      );
    }

    if (!isReviewRequirementSatisfied(item)) {
      failures.push(
        `${item.code ?? item.itemDescription}: review requirement not satisfied`
      );
    }

    if (status === "UNDER_REVIEW") {
      failures.push(
        `${item.code ?? item.itemDescription}: item is still under review`
      );
    }
  }

  if (
    workflow.status === "ACTIVE" &&
    (workflow.syncStatus === "SYNCED" || workflow.syncStatus === "SYNC_ERROR")
  ) {
    return { passed: true, failures: [] };
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

function toMirrorCompletedBy(item: AdmissionChecklistItem) {
  if (item.status === "WAIVED") {
    return item.waivedById ? String(item.waivedById) : null;
  }
  return item.completedById ? String(item.completedById) : null;
}

function toMirrorCompletedAt(item: AdmissionChecklistItem) {
  if (item.status === "WAIVED") return item.waivedAt ?? null;
  return item.completedAt ?? null;
}

async function getWorkflowOrThrow(workflowId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const workflow = await db
    .select()
    .from(admissionWorkflows)
    .where(eq(admissionWorkflows.id, workflowId))
    .then((rows) => rows[0] ?? null);

  if (!workflow) throw new Error("Admission workflow not found");
  return workflow;
}

export async function syncMirror(workflowId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const workflow = await getWorkflowOrThrow(workflowId);
  if (!workflow.resultEmployeeId) {
    throw new Error("Admission workflow has no linked employee");
  }

  const items = await listChecklistWithEvidence(workflowId);
  const relevantItems = items.filter(
    (item) => item.status === "COMPLETED" || item.status === "WAIVED"
  );

  for (const item of relevantItems) {
    const primaryDocument = item.primaryEvidence;
    const mirrorCompletedAt = toMirrorCompletedAt(item);
    const mirrorRow: InsertChecklistItem = {
      employeeId: workflow.resultEmployeeId,
      checklistType: "Admissão",
      category: item.category,
      itemDescription: item.itemDescription,
      isCompleted: true,
      completedDate: mirrorCompletedAt ? new Date(mirrorCompletedAt) : null,
      completedBy: toMirrorCompletedBy(item),
      documentId: primaryDocument?.id ?? null,
      sourceWorkflowId: workflow.id,
      sourceItemId: item.id,
      mirrorOrigin: "admission_workflow",
      isEditable: false,
    };

    await db
      .insert(checklistItems)
      .values(mirrorRow)
      .onDuplicateKeyUpdate({
        set: {
          sourceWorkflowId: workflow.id,
          sourceItemId: item.id,
          mirrorOrigin: "admission_workflow",
          itemDescription: item.itemDescription,
          category: item.category,
          isCompleted: true,
          completedDate: mirrorCompletedAt ? new Date(mirrorCompletedAt) : null,
          completedBy: toMirrorCompletedBy(item),
          documentId: primaryDocument?.id ?? null,
          isEditable: false,
        },
      });
  }

  await db
    .update(admissionWorkflows)
    .set({ syncStatus: "SYNCED" })
    .where(eq(admissionWorkflows.id, workflowId));

  return {
    workflowId,
    synced: true,
    mirroredItems: relevantItems.length,
  };
}

export async function retrySync(workflowId: number) {
  const workflow = await getWorkflowOrThrow(workflowId);
  if (workflow.syncStatus !== "SYNC_ERROR") {
    throw new Error("Retry sync is only allowed for workflows in SYNC_ERROR");
  }
  return syncMirror(workflowId);
}

export function canWaiveChecklistItem(
  workflow: Pick<AdmissionWorkflow, "catalogVersion">,
  item: Pick<AdmissionChecklistItem, "code" | "required">
) {
  const catalogItem = getAdmissionCatalog(
    workflow.catalogVersion ?? CURRENT_CATALOG_VERSION
  ).find((entry) => entry.code === item.code);

  if (!catalogItem) return false;
  if (!item.required) return true;
  return catalogItem.waivable;
}

export async function waiveChecklistItem(
  workflowId: number,
  itemId: number,
  userId: number | undefined,
  reason: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const workflow = await getWorkflowOrThrow(workflowId);
  const item = await db
    .select()
    .from(admissionChecklistItems)
    .where(
      and(
        eq(admissionChecklistItems.id, itemId),
        eq(admissionChecklistItems.workflowId, workflowId)
      )
    )
    .then((rows) => rows[0] ?? null);

  if (!item) throw new Error("Checklist item not found");
  if (!canWaiveChecklistItem(workflow, item)) {
    throw new Error("Checklist item cannot be waived");
  }

  await db
    .update(admissionChecklistItems)
    .set({
      status: "WAIVED",
      waivedReason: reason,
      waivedById: userId ?? null,
      waivedAt: new Date(),
      completed: false,
      completedAt: null,
      completedById: null,
    })
    .where(eq(admissionChecklistItems.id, itemId));

  return db
    .select()
    .from(admissionChecklistItems)
    .where(eq(admissionChecklistItems.id, itemId))
    .then((rows) => rows[0] ?? null);
}

export async function reviewChecklistItem(
  workflowId: number,
  itemId: number,
  userId: number | undefined,
  reviewStatus: "pending" | "approved" | "rejected",
  reviewNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const reviewedAt = new Date();

  await db
    .update(admissionChecklistItems)
    .set({
      reviewStatus,
      reviewedById: userId ?? null,
      reviewedAt,
      reviewNotes: reviewNotes ?? null,
    })
    .where(
      and(
        eq(admissionChecklistItems.id, itemId),
        eq(admissionChecklistItems.workflowId, workflowId)
      )
    );

  const item = await listChecklistWithEvidence(workflowId).then((rows) =>
    rows.find((entry) => entry.id === itemId)
  );
  if (!item) throw new Error("Checklist item not found");

  const status = await persistComputedStatus(item);
  return {
    ...item,
    reviewStatus,
    reviewedById: userId ?? null,
    reviewedAt,
    reviewNotes: reviewNotes ?? null,
    status,
  };
}
