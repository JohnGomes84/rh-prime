import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Bell, CheckCircle2, AlertCircle, AlertTriangle, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  severity: "Info" | "Aviso" | "Crítico";
  isRead: boolean;
  createdAt: Date | string;
  dueDate?: Date | string | null;
};

export default function Notifications() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery();
  const countQuery = trpc.notifications.count.useQuery();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.count.invalidate(),
      ]);
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.count.invalidate(),
      ]);
    },
  });

  const getIcon = (severity: string) => {
    switch (severity) {
      case "Crítico":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "Aviso":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const unreadCount = (countQuery.data as number | undefined) ?? 0;
  const items = (notifications ?? []) as NotificationItem[];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
            <p className="text-muted-foreground">
              Alertas e avisos do sistema.
              {unreadCount > 0 && (
                <span className="ml-2 font-medium text-foreground">
                  {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhuma notificação no momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((notif) => (
              <Card
                key={notif.id}
                className={cn(
                  "border-0 shadow-sm transition-colors",
                  !notif.isRead && "bg-primary/[0.03] border-l-4 border-l-primary",
                )}
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">{getIcon(notif.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className={cn("text-sm", !notif.isRead ? "font-semibold" : "font-medium")}>
                          {notif.title}
                        </h3>
                        <Badge
                          variant={notif.isRead ? "secondary" : "default"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {notif.isRead ? "Lida" : "Nova"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {notif.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => markRead.mutate({ id: notif.id })}
                        disabled={markRead.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Lida
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
