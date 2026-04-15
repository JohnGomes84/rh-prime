import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";

export type ModulePermission = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function usePermissions() {
  const { user } = useAuth();
  const { data: permissions, isLoading } = trpc.usuarios.myPermissions.useQuery(
    undefined,
    { enabled: !!user }
  );

  const can = (module: string, action: "canView" | "canCreate" | "canEdit" | "canDelete"): boolean => {
    if (user?.role === "admin") return true;
    if (!permissions) return false;
    const perm = permissions[module as keyof typeof permissions] as ModulePermission | undefined;
    return perm?.[action] === true;
  };

  const canView = (module: string) => can(module, "canView");
  const canCreate = (module: string) => can(module, "canCreate");
  const canEdit = (module: string) => can(module, "canEdit");
  const canDelete = (module: string) => can(module, "canDelete");

  return {
    permissions,
    isLoading,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    isAdmin: user?.role === "admin",
  };
}
