import { describe, expect, it } from "vitest";
import { resolveJourneyEligibility } from "./eligibility.js";

describe("resolveJourneyEligibility", () => {
  it("libera CLT padrao ativo com politica e contrato ativo", () => {
    const result = resolveJourneyEligibility({
      employeeStatus: "Ativo",
      contractActive: true,
      hasPolicy: true,
      operationalCategory: "clt_padrao",
      requiresTimeTracking: true,
      requiresContextBinding: false,
      hasActiveAssignmentContext: false,
      contextRequirementSatisfied: true,
      pointRequirementMode: "always",
    });

    expect(result).toEqual({
      isEligibleForTimeTracking: true,
      canRegisterPunch: true,
      reasonCode: "eligible",
    });
  });

  it("bloqueia quando nao ha politica de jornada resolvida", () => {
    const result = resolveJourneyEligibility({
      employeeStatus: "Ativo",
      contractActive: true,
      hasPolicy: false,
      operationalCategory: "clt_padrao",
      requiresTimeTracking: true,
      requiresContextBinding: false,
      hasActiveAssignmentContext: false,
      contextRequirementSatisfied: true,
      pointRequirementMode: "always",
    });

    expect(result.reasonCode).toBe("missing_policy");
    expect(result.canRegisterPunch).toBe(false);
  });

  it("bloqueia quando colaborador nao esta ativo", () => {
    const result = resolveJourneyEligibility({
      employeeStatus: "Afastado",
      contractActive: true,
      hasPolicy: true,
      operationalCategory: "clt_padrao",
      requiresTimeTracking: true,
      requiresContextBinding: false,
      hasActiveAssignmentContext: false,
      contextRequirementSatisfied: true,
      pointRequirementMode: "always",
    });

    expect(result.reasonCode).toBe("employee_not_active");
    expect(result.isEligibleForTimeTracking).toBe(false);
  });

  it("bloqueia categoria sem ponto", () => {
    const result = resolveJourneyEligibility({
      employeeStatus: "Ativo",
      contractActive: true,
      hasPolicy: true,
      operationalCategory: "sem_ponto",
      requiresTimeTracking: false,
      requiresContextBinding: false,
      hasActiveAssignmentContext: false,
      contextRequirementSatisfied: true,
      pointRequirementMode: "never",
    });

    expect(result.reasonCode).toBe("time_tracking_not_required");
    expect(result.canRegisterPunch).toBe(false);
  });

  it("mantem intermitente elegivel mas bloqueia batida sem contexto quando exigido", () => {
    const result = resolveJourneyEligibility({
      employeeStatus: "Ativo",
      contractActive: true,
      hasPolicy: true,
      operationalCategory: "intermitente_com_ponto_condicional",
      requiresTimeTracking: true,
      requiresContextBinding: true,
      hasActiveAssignmentContext: false,
      contextRequirementSatisfied: false,
      pointRequirementMode: "conditional_by_context",
    });

    expect(result).toEqual({
      isEligibleForTimeTracking: true,
      canRegisterPunch: false,
      reasonCode: "missing_active_context",
    });
  });

  it("permite intermitente com contexto ativo e exigencia satisfeita", () => {
    const result = resolveJourneyEligibility({
      employeeStatus: "Ativo",
      contractActive: true,
      hasPolicy: true,
      operationalCategory: "intermitente_com_ponto_condicional",
      requiresTimeTracking: true,
      requiresContextBinding: true,
      hasActiveAssignmentContext: true,
      contextRequirementSatisfied: true,
      pointRequirementMode: "conditional_by_context",
    });

    expect(result.reasonCode).toBe("eligible");
    expect(result.canRegisterPunch).toBe(true);
  });

  it("bloqueia quando a politica exige contexto e o contexto nao esta resolvido", () => {
    const result = resolveJourneyEligibility({
      employeeStatus: "Ativo",
      contractActive: true,
      hasPolicy: true,
      operationalCategory: "clt_alocado",
      requiresTimeTracking: true,
      requiresContextBinding: true,
      hasActiveAssignmentContext: true,
      contextRequirementSatisfied: false,
      pointRequirementMode: "always",
    });

    expect(result).toEqual({
      isEligibleForTimeTracking: true,
      canRegisterPunch: false,
      reasonCode: "missing_required_context",
    });
  });
});
