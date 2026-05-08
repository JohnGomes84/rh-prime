import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useRole, type AppRole } from "@/_core/hooks/useRole";

interface RouteGuardProps {
  /** Roles permitidos. Se omitido, basta estar autenticado. */
  allowedRoles?: AppRole[];
  /** Para onde redirecionar quando bloqueado. Default: "/". */
  redirectTo?: string;
  children: React.ReactNode;
}

export function RouteGuard({ allowedRoles, redirectTo = "/", children }: RouteGuardProps) {
  const { role, loading } = useRole();
  const [, setLocation] = useLocation();

  const blocked = !loading && (!role || (allowedRoles && !allowedRoles.includes(role)));

  useEffect(() => {
    if (blocked) {
      setLocation(redirectTo);
    }
  }, [blocked, redirectTo, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
        <p className="text-muted-foreground mb-4">
          Você não tem permissão para acessar esta página. Redirecionando…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <RouteGuard allowedRoles={["admin"]}>{children}</RouteGuard>;
}

export function ManagerGuard({ children }: { children: React.ReactNode }) {
  return <RouteGuard allowedRoles={["admin", "gestor"]}>{children}</RouteGuard>;
}
