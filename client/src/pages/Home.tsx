import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, Loader2 } from "lucide-react";

export default function Home() {
  const { isLoading: authLoading } = trpc.auth.me.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao RH Prime
          </p>
        </div>

        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Sistema de Gestão de RH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              O painel agora usa os indicadores reais expostos pelo backend.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {statsLoading ? "..." : stats?.totalEmployees ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total cadastrado</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {statsLoading ? "..." : stats?.activeEmployees ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Funcionários ativos</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Férias Vencidas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {statsLoading ? "..." : stats?.overdueVacations ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pendências de férias</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Exames Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-rose-600">
                {statsLoading ? "..." : stats?.expiredExams ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Saúde ocupacional</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Banco de Horas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-cyan-600">
                {statsLoading ? "..." : stats?.expiringTimeBank ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Saldos a vencer</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-violet-600">
                {statsLoading ? "..." : stats?.unreadNotifications ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Não lidas</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
