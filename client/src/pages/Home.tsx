import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Users, Loader2, Cake, Timer } from "lucide-react";
import { useRole } from "@/_core/hooks/useRole";
import { useLocation } from "wouter";

export default function Home() {
  const { isLoading: authLoading } = trpc.auth.me.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: birthdays = [] } = trpc.dashboard.birthdays.useQuery();
  const { isManager } = useRole();
  const [, setLocation] = useLocation();

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

        {!isManager && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-emerald-600" />
                Bater ponto
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Registre sua jornada de trabalho.
              </p>
              <Button onClick={() => setLocation("/ponto-novo")} className="bg-emerald-600 hover:bg-emerald-700">
                Registrar agora
              </Button>
            </CardContent>
          </Card>
        )}

        {isManager && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Sistema de Gestão de RH
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                Indicadores em tempo real vindos do backend.
              </p>
            </CardContent>
          </Card>
        )}

        {isManager && (
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
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-5 w-5 text-pink-600" />
              Aniversariantes do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {birthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aniversariante este mês.</p>
            ) : (
              <ul className="divide-y divide-border">
                {birthdays.map((b: any) => {
                  const date = b.birthDate ? new Date(b.birthDate) : null;
                  const day = date ? String(date.getDate()).padStart(2, "0") : "??";
                  const today = new Date();
                  const isToday = date && date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
                  return (
                    <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full ${isToday ? "bg-pink-100 text-pink-700 font-bold" : "bg-muted text-muted-foreground"}`}>
                          {day}
                        </span>
                        <span className={isToday ? "font-semibold" : ""}>{b.fullName}</span>
                        {isToday && <span className="text-xs text-pink-600">🎂 hoje</span>}
                      </div>
                      {b.phone && (
                        <a
                          href={`https://wa.me/55${String(b.phone).replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          WhatsApp
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
