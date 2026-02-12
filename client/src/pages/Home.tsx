import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Users,
  CalendarDays,
  HeartPulse,
  Clock,
  AlertTriangle,
  Bell,
  TrendingUp,
  UserCheck,
  UserX,
  Loader2,
} from "lucide-react";

export default function Home() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do departamento de Recursos Humanos
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-0 shadow-sm bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Funcionários
                  </CardTitle>
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {stats?.totalEmployees ?? 0}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">
                      {stats?.activeEmployees ?? 0} ativos
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Férias Vencendo
                  </CardTitle>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${(stats?.overdueVacations ?? 0) > 0 ? "bg-destructive/10" : "bg-primary/10"}`}>
                    <CalendarDays className={`h-4 w-4 ${(stats?.overdueVacations ?? 0) > 0 ? "text-destructive" : "text-primary"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${(stats?.overdueVacations ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
                    {stats?.overdueVacations ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Períodos concessivos vencidos
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    ASOs Vencidos
                  </CardTitle>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${(stats?.expiredExams ?? 0) > 0 ? "bg-destructive/10" : "bg-primary/10"}`}>
                    <HeartPulse className={`h-4 w-4 ${(stats?.expiredExams ?? 0) > 0 ? "text-destructive" : "text-primary"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${(stats?.expiredExams ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
                    {stats?.expiredExams ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exames com validade expirada
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Banco de Horas
                  </CardTitle>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${(stats?.expiringTimeBank ?? 0) > 0 ? "bg-amber-100" : "bg-primary/10"}`}>
                    <Clock className={`h-4 w-4 ${(stats?.expiringTimeBank ?? 0) > 0 ? "text-amber-600" : "text-primary"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${(stats?.expiringTimeBank ?? 0) > 0 ? "text-amber-600" : "text-foreground"}`}>
                    {stats?.expiringTimeBank ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Saldos expirando em 30 dias
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Alerts Section */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Alertas Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(stats?.overdueVacations ?? 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-foreground">Férias com período concessivo vencido</span>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {stats?.overdueVacations}
                        </Badge>
                      </div>
                    )}
                    {(stats?.expiredExams ?? 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="flex items-center gap-3">
                          <HeartPulse className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-foreground">ASOs com validade expirada</span>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {stats?.expiredExams}
                        </Badge>
                      </div>
                    )}
                    {(stats?.expiringTimeBank ?? 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <span className="text-sm text-foreground">Banco de horas expirando</span>
                        </div>
                        <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200">
                          {stats?.expiringTimeBank}
                        </Badge>
                      </div>
                    )}
                    {(stats?.overdueVacations ?? 0) === 0 &&
                      (stats?.expiredExams ?? 0) === 0 &&
                      (stats?.expiringTimeBank ?? 0) === 0 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-emerald-700">
                            Nenhum alerta crítico. Tudo em dia!
                          </span>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Resumo por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.statusCounts && stats.statusCounts.length > 0 ? (
                      stats.statusCounts.map((sc) => (
                        <div
                          key={sc.status}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            {sc.status === "Ativo" ? (
                              <UserCheck className="h-4 w-4 text-emerald-600" />
                            ) : sc.status === "Inativo" ? (
                              <UserX className="h-4 w-4 text-muted-foreground" />
                            ) : sc.status === "Férias" ? (
                              <CalendarDays className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Users className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="text-sm text-foreground">{sc.status}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {sc.count}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Nenhum funcionário cadastrado ainda
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
