export type JourneyOperationalCategory =
  | "clt_padrao"
  | "clt_alocado"
  | "clt_multiposto"
  | "intermitente_com_ponto_condicional"
  | "sem_ponto";

export type JourneyPointRequirementMode =
  | "always"
  | "conditional_by_context"
  | "never";

export type JourneyEligibilityReasonCode =
  | "eligible"
  | "missing_policy"
  | "employee_not_active"
  | "contract_not_active"
  | "time_tracking_not_required"
  | "missing_active_context"
  | "missing_required_context";

export interface ResolveJourneyEligibilityInput {
  employeeStatus?: string | null;
  contractActive: boolean;
  hasPolicy: boolean;
  operationalCategory: JourneyOperationalCategory;
  requiresTimeTracking: boolean;
  requiresContextBinding: boolean;
  hasActiveAssignmentContext: boolean;
  contextRequirementSatisfied: boolean;
  pointRequirementMode: JourneyPointRequirementMode;
}

export interface JourneyEligibilityResult {
  isEligibleForTimeTracking: boolean;
  canRegisterPunch: boolean;
  reasonCode: JourneyEligibilityReasonCode;
}

function isEmployeeActive(status?: string | null): boolean {
  return status === "Ativo";
}

export function resolveJourneyEligibility(
  input: ResolveJourneyEligibilityInput,
): JourneyEligibilityResult {
  if (!input.hasPolicy) {
    return {
      isEligibleForTimeTracking: false,
      canRegisterPunch: false,
      reasonCode: "missing_policy",
    };
  }

  if (!isEmployeeActive(input.employeeStatus)) {
    return {
      isEligibleForTimeTracking: false,
      canRegisterPunch: false,
      reasonCode: "employee_not_active",
    };
  }

  if (!input.contractActive) {
    return {
      isEligibleForTimeTracking: false,
      canRegisterPunch: false,
      reasonCode: "contract_not_active",
    };
  }

  if (!input.requiresTimeTracking || input.operationalCategory === "sem_ponto") {
    return {
      isEligibleForTimeTracking: false,
      canRegisterPunch: false,
      reasonCode: "time_tracking_not_required",
    };
  }

  if (input.operationalCategory === "intermitente_com_ponto_condicional") {
    if (input.pointRequirementMode === "never") {
      return {
        isEligibleForTimeTracking: false,
        canRegisterPunch: false,
        reasonCode: "time_tracking_not_required",
      };
    }

    if (
      input.pointRequirementMode === "conditional_by_context"
      && !input.hasActiveAssignmentContext
    ) {
      return {
        isEligibleForTimeTracking: true,
        canRegisterPunch: false,
        reasonCode: "missing_active_context",
      };
    }
  }

  if (input.requiresContextBinding && !input.contextRequirementSatisfied) {
    return {
      isEligibleForTimeTracking: true,
      canRegisterPunch: false,
      reasonCode: "missing_required_context",
    };
  }

  return {
    isEligibleForTimeTracking: true,
    canRegisterPunch: true,
    reasonCode: "eligible",
  };
}
