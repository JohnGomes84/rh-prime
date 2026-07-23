import * as db from "../db.js";
import { isFeatureEnabled } from "./feature-flags.js";

function parseBooleanValue(value: string | undefined | null): boolean | null {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function parseListValue(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export type CollaboratorAppPilotUser = {
  id: number;
  email?: string | null;
  role?: string | null;
};

export async function getCollaboratorAppRuntimeConfig() {
  const settings = await db.listSettings().catch(() => []);
  const map = new Map((settings as Array<{ key: string; value: string }>).map((item) => [item.key, item.value]));

  const settingEnabled = parseBooleanValue(map.get("collaborator_app.enabled"));
  const enabled = settingEnabled ?? isFeatureEnabled("collaborator-app");

  const allowedRoles = parseListValue(map.get("collaborator_app.allowed_roles") ?? process.env.COLLABORATOR_APP_ALLOWED_ROLES)
    .map((entry) => entry.toLowerCase());
  const allowedEmails = parseListValue(map.get("collaborator_app.allowed_emails") ?? process.env.COLLABORATOR_APP_ALLOWED_EMAILS)
    .map((entry) => entry.toLowerCase());
  const allowedUserIds = parseListValue(map.get("collaborator_app.allowed_user_ids") ?? process.env.COLLABORATOR_APP_ALLOWED_USER_IDS);

  return {
    enabled,
    allowedRoles,
    allowedEmails,
    allowedUserIds,
    hasScopedPilot: allowedRoles.length > 0 || allowedEmails.length > 0 || allowedUserIds.length > 0,
    source: settingEnabled !== null ? "settings" : "environment",
  } as const;
}

export async function getCollaboratorAppPilotAccess(user?: CollaboratorAppPilotUser | null) {
  const config = await getCollaboratorAppRuntimeConfig();

  if (!config.enabled) {
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

  if (!config.hasScopedPilot) {
    return {
      enabled: true,
      reason: "global_rollout",
    } as const;
  }

  const roleMatch = user.role ? config.allowedRoles.includes(String(user.role).toLowerCase()) : false;
  const emailMatch = user.email ? config.allowedEmails.includes(String(user.email).toLowerCase()) : false;
  const userIdMatch = config.allowedUserIds.includes(String(user.id));

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
