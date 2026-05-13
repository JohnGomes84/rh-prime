import { describe, expect, it } from "vitest";
import { recomputeItemStatus } from "./admission-checklist.service.js";

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    workflowId: 1,
    code: "ADM_DOC_RG",
    category: "documentacao_pessoal",
    itemDescription: "Copia do RG",
    kind: "upload_required",
    status: "PENDING",
    documentPolicy: "required_single",
    templatePolicy: "none",
    templateKey: null,
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    reviewStatus: null,
    reviewedById: null,
    reviewedAt: null,
    reviewNotes: null,
    required: true,
    completed: false,
    documentUrl: null,
    notes: null,
    completedAt: null,
    completedById: null,
    waivedReason: null,
    waivedById: null,
    waivedAt: null,
    ...overrides,
  } as any;
}

describe("recomputeItemStatus", () => {
  it("returns AWAITING_EVIDENCE when required evidence is missing", () => {
    const status = recomputeItemStatus(makeItem(), null, []);
    expect(status).toBe("AWAITING_EVIDENCE");
  });

  it("returns UNDER_REVIEW when evidence exists and manual review is pending", () => {
    const status = recomputeItemStatus(
      makeItem({ reviewStatus: "pending" }),
      { id: 10, isPrimaryEvidence: true } as any,
      []
    );
    expect(status).toBe("UNDER_REVIEW");
  });

  it("returns COMPLETED when evidence exists and manual review is approved", () => {
    const status = recomputeItemStatus(
      makeItem({ reviewStatus: "approved" }),
      { id: 10, isPrimaryEvidence: true } as any,
      []
    );
    expect(status).toBe("COMPLETED");
  });

  it("returns AWAITING_SIGNATURE for employee signature requirement", () => {
    const status = recomputeItemStatus(
      makeItem({
        kind: "generate_document",
        reviewPolicy: "auto_complete",
        signaturePolicy: "employee_required",
      }),
      { id: 10, isPrimaryEvidence: true } as any,
      []
    );
    expect(status).toBe("AWAITING_SIGNATURE");
  });

  it("returns COMPLETED when both signatures are present", () => {
    const status = recomputeItemStatus(
      makeItem({
        kind: "generate_document",
        reviewPolicy: "auto_complete",
        signaturePolicy: "both_required",
      }),
      { id: 10, isPrimaryEvidence: true } as any,
      [
        { signatoryType: "employee" },
        { signatoryType: "company_representative" },
      ] as any
    );
    expect(status).toBe("COMPLETED");
  });
});
