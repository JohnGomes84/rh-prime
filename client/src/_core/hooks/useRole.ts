import { useAuth } from "./useAuth";

export type AppRole = "admin" | "gestor" | "colaborador" | "user";

const ROLE_RANK: Record<AppRole, number> = {
  admin: 100,
  gestor: 50,
  colaborador: 10,
  user: 10,
};

export interface RoleHelpers {
  role: AppRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  hasAtLeast: (minimum: AppRole) => boolean;
  hasAnyOf: (roles: AppRole[]) => boolean;
  loading: boolean;
}

export function useRole(): RoleHelpers {
  const { user, loading } = useAuth();
  const role = (user?.role as AppRole | undefined) ?? null;

  const hasAtLeast = (minimum: AppRole): boolean => {
    if (!role) return false;
    return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minimum] ?? 0);
  };

  const hasAnyOf = (roles: AppRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  return {
    role,
    isAdmin: role === "admin",
    isManager: role === "admin" || role === "gestor",
    isEmployee: !!role,
    hasAtLeast,
    hasAnyOf,
    loading,
  };
}
