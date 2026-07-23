function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseListFlag(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isFeatureEnabled(name: string): boolean {
  const normalized = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const directKey = `${normalized}_ENABLED`;
  if (parseBooleanFlag(process.env[directKey])) return true;

  const list = process.env.FEATURE_FLAGS;
  if (!list) return false;

  return list
    .split(",")
    .map((entry) => entry.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"))
    .includes(normalized);
}

type CollaboratorAppPilotUser = {
  id: number;
  email?: string | null;
  role?: string | null;
};

export function getCollaboratorAppPilotAccess(user?: CollaboratorAppPilotUser | null) {
  const globallyEnabled = isFeatureEnabled("collaborator-app");

  if (!globallyEnabled) {
    return {
      enabled: false,
      reason: "feature_disabled",
    } as const;
  }

  if (!user) {
    return {
      enabled: false,
      reason: "unauthenticated",
    } as const;
  }

  if (user.role === "admin") {
    return {
      enabled: true,
      reason: "admin_override",
    } as const;
  }

  const allowedRoles = parseListFlag(process.env.COLLABORATOR_APP_ALLOWED_ROLES).map((entry) => entry.toLowerCase());
  const allowedEmails = parseListFlag(process.env.COLLABORATOR_APP_ALLOWED_EMAILS).map((entry) => entry.toLowerCase());
  const allowedUserIds = parseListFlag(process.env.COLLABORATOR_APP_ALLOWED_USER_IDS);
  const hasScopedPilot = allowedRoles.length > 0 || allowedEmails.length > 0 || allowedUserIds.length > 0;

  if (!hasScopedPilot) {
    return {
      enabled: true,
      reason: "global_rollout",
    } as const;
  }

  const roleMatch = user.role ? allowedRoles.includes(String(user.role).toLowerCase()) : false;
  const emailMatch = user.email ? allowedEmails.includes(String(user.email).toLowerCase()) : false;
  const userIdMatch = allowedUserIds.includes(String(user.id));

  if (roleMatch || emailMatch || userIdMatch) {
    return {
      enabled: true,
      reason: roleMatch ? "allowed_role" : emailMatch ? "allowed_email" : "allowed_user_id",
    } as const;
  }

  return {
    enabled: false,
    reason: "pilot_scope_restricted",
  } as const;
}
