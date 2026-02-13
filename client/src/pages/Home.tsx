import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, Loader2 } from "lucide-react";

export default function Home() {
  const { data: auth, isLoading: authLoading } = trpc.auth.me.useQuery();

  // Se não está autenticado, redirecionar para login OAuth
  if (!auth && !authLoading) {
    window.location.href = `/api/oauth/login`;
    return null;
  }

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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao RH Prime
          </p>
        </div>

        {/* Welcome Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Sistema de Gestão de RH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Bem-vindo ao RH Prime! Este é seu painel de controle para gerenciar todos os aspectos de Recursos Humanos da sua empresa.
            </p>
            <p className="text-sm text-gray-600 mt-3">
              Use o menu lateral para acessar as diferentes funcionalidades do sistema.
            </p>
          </CardContent>
        </Card>

        {/* Quick Access Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">-</p>
              <p className="text-xs text-muted-foreground mt-1">Gerenciar equipe</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Férias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">-</p>
              <p className="text-xs text-muted-foreground mt-1">Controlar períodos</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Folha de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">-</p>
              <p className="text-xs text-muted-foreground mt-1">Processar folhas</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-blue-900">ℹ️ Informação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800">
              O sistema está pronto para uso. Acesse as funcionalidades através do menu lateral.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
