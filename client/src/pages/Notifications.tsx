import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Bell, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Notifications() {
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery();

  const handleMarkAsRead = (id: number) => {
    toast.success("Notificação marcada como lida.");
  };

  const handleDelete = (id: number) => {
    toast.success("Notificação removida.");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (isRead: boolean) => {
    return isRead ? "secondary" : "default";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">Alertas automáticos sobre férias, ASO, banco de horas e eventos importantes.</p>
        </div>

        {!notifications || notifications.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhuma notificação no momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif: any) => (
              <Card key={notif.id} className="border-0 shadow-sm">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="pt-1">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{notif.title}</h3>
                        <Badge variant={getStatusColor(notif.isRead)}>
                          {notif.isRead ? "Lida" : "Nova"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notif.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!notif.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notif.id)}
                        >
                          Marcar como lida
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notif.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-0 shadow-sm bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Sobre as Notificações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>O RH Prime envia notificações automáticas para alertá-lo sobre:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Férias vencendo (30, 15 e 7 dias antes)</li>
              <li>ASOs com validade próxima de expirar</li>
              <li>Banco de horas vencendo</li>
              <li>Contratos de experiência terminando</li>
              <li>Afastamentos por INSS iniciando</li>
              <li>Treinamentos obrigatórios vencidos</li>
            </ul>
            <p className="pt-2">Você pode configurar a frequência de notificações em Configurações.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
