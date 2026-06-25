import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock, Shield, UserCheck } from "lucide-react";

const publicRegistrationEnabled =
  import.meta.env.VITE_PUBLIC_REGISTRATION_ENABLED === "true";

export default function SecuritySettings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Configuracoes de Seguranca
          </h1>
          <p className="text-muted-foreground mt-1">
            Politicas efetivas de autenticacao, acesso e permissoes
          </p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Autenticacao
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">Sessao JWT</p>
                  <p className="text-sm text-muted-foreground">
                    Cookie httpOnly e senha com hash forte
                  </p>
                </div>
                <Badge>Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">Cadastro publico</p>
                  <p className="text-sm text-muted-foreground">
                    Usuarios devem ser criados por administradores em Acessos
                  </p>
                </div>
                <Badge variant={publicRegistrationEnabled ? "destructive" : "secondary"}>
                  {publicRegistrationEnabled ? "Aberto" : "Fechado"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permissoes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>- Admin: acesso total ao sistema</p>
                <p>- Gestor: gerencia equipe e relatorios</p>
                <p>- Colaborador: acessa dados pessoais e ponto</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Operacoes de Acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>- Criacao de usuarios: apenas administradores</p>
                <p>- Alteracao de perfil: apenas administradores</p>
                <p>- Vinculo funcionario-usuario: apenas administradores</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Politicas Tecnicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>- Rate limit em login, cadastro e recuperacao de senha</p>
                <p>- CSRF mitigado por validacao de origem em POST tRPC</p>
                <p>- WebSocket autenticado pela sessao existente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
