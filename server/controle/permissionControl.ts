import { eq, and } from "drizzle-orm";
import { users, userPermissions, SYSTEM_MODULES, type SystemModule } from "../../drizzle/schema";
import { getDb } from "../db";

export type PermissionMap = Record<SystemModule, {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}>;

// In-memory cache: userId → { map, expiresAt }
const CACHE_TTL_MS = 90_000;
const permCache = new Map<number, { map: PermissionMap; isAdmin: boolean; expiresAt: number }>();

function getCached(userId: number) {
  const entry = permCache.get(userId);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry;
}

export function invalidateUserPermissions(userId: number) {
  permCache.delete(userId);
}

export async function getUserPermissions(userId: number): Promise<PermissionMap> {
  const cached = getCached(userId);
  if (cached) return cached.map;

  const db = await getDb();
  if (!db) return getEmptyPermissions();

  const [userRecord] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const isAdmin = userRecord?.role === "admin";
  const map = isAdmin ? getFullPermissions() : getEmptyPermissions();

  if (!isAdmin) {
    const perms = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
    for (const p of perms) {
      const mod = p.module as SystemModule;
      if (SYSTEM_MODULES.includes(mod)) {
        map[mod] = { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete };
      }
    }
  }

  permCache.set(userId, { map, isAdmin, expiresAt: Date.now() + CACHE_TTL_MS });
  return map;
}

export async function checkPermission(
  userId: number,
  module: SystemModule,
  action: "canView" | "canCreate" | "canEdit" | "canDelete"
): Promise<boolean> {
  const cached = getCached(userId);
  if (cached) {
    if (cached.isAdmin) return true;
    return cached.map[module]?.[action] ?? false;
  }

  const db = await getDb();
  if (!db) return false;

  const [userRecord] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const isAdmin = userRecord?.role === "admin";

  if (isAdmin) {
    permCache.set(userId, { map: getFullPermissions(), isAdmin: true, expiresAt: Date.now() + CACHE_TTL_MS });
    return true;
  }

  const [perm] = await db
    .select()
    .from(userPermissions)
    .where(and(eq(userPermissions.userId, userId), eq(userPermissions.module, module)))
    .limit(1);

  // Cache miss: populate full map so next calls hit cache
  const fullMap = getEmptyPermissions();
  if (perm) fullMap[module] = { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete };
  permCache.set(userId, { map: fullMap, isAdmin: false, expiresAt: Date.now() + CACHE_TTL_MS });

  return perm?.[action] ?? false;
}

export async function setUserModulePermission(
  userId: number,
  module: SystemModule,
  permissions: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const [existing] = await db
      .select({ id: userPermissions.id })
      .from(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.module, module)))
      .limit(1);

    if (existing) {
      await db
        .update(userPermissions)
        .set(permissions)
        .where(and(eq(userPermissions.userId, userId), eq(userPermissions.module, module)));
    } else {
      await db.insert(userPermissions).values({ userId, module, ...permissions });
    }

    invalidateUserPermissions(userId);
    return true;
  } catch (error) {
    console.error("[PermissionControl] Error setting permission:", error);
    return false;
  }
}

export async function setAllUserPermissions(
  userId: number,
  permissions: Partial<PermissionMap>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    for (const [module, perms] of Object.entries(permissions)) {
      await setUserModulePermission(userId, module as SystemModule, perms);
    }
    invalidateUserPermissions(userId);
    return true;
  } catch (error) {
    console.error("[PermissionControl] Error setting all permissions:", error);
    return false;
  }
}

export async function listUsersWithPermissions() {
  const db = await getDb();
  if (!db) return [];

  const [allUsers, allPerms] = await Promise.all([
    db.select().from(users),
    db.select().from(userPermissions),
  ]);

  return allUsers.map((user) => {
    if (user.role === "admin") return { ...user, permissions: getFullPermissions() };

    const permMap = getEmptyPermissions();
    for (const p of allPerms.filter((p) => p.userId === user.id)) {
      const mod = p.module as SystemModule;
      if (SYSTEM_MODULES.includes(mod)) {
        permMap[mod] = { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete };
      }
    }
    return { ...user, permissions: permMap };
  });
}

function getEmptyPermissions(): PermissionMap {
  const map = {} as PermissionMap;
  for (const mod of SYSTEM_MODULES) map[mod] = { canView: false, canCreate: false, canEdit: false, canDelete: false };
  return map;
}

function getFullPermissions(): PermissionMap {
  const map = {} as PermissionMap;
  for (const mod of SYSTEM_MODULES) map[mod] = { canView: true, canCreate: true, canEdit: true, canDelete: true };
  return map;
}
