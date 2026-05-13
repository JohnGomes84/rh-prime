import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import type { ReactNode } from "react";

type Role = "admin" | "gestor" | "colaborador" | "user";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role as Role)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
