import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";

const POLL_INTERVAL_MS = 30_000;

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

function formatRelative(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "agora";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

function severityClass(severity: string): string {
  if (severity === "Crítico") return "border-l-destructive";
  if (severity === "Aviso") return "border-l-amber-500";
  return "border-l-sky-500";
}

function targetFromTitle(title: string): string | null {
  if (title.includes("Tarefa") || title.includes("designado") || title.includes("Kanban") || title.includes("demanda") || title.includes("aceita") || title.includes("movido")) return "/kanban-v2";
  return null;
}

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const wsCtx = useNotifications();
  const lastWsCount = useRef(0);

  const countQuery = trpc.notifications.count.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const listQuery = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  // Push do WebSocket: ao chegar nova notificação volátil, força refetch das persistidas.
  useEffect(() => {
    if (wsCtx.notifications.length > lastWsCount.current) {
      void utils.notifications.count.invalidate();
      void utils.notifications.list.invalidate();
    }
    lastWsCount.current = wsCtx.notifications.length;
  }, [wsCtx.notifications, utils]);

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.count.invalidate(),
        utils.notifications.list.invalidate(),
      ]);
    },
  });

  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.count.invalidate(),
        utils.notifications.list.invalidate(),
      ]);
    },
  });

  const items = (listQuery.data ?? []) as NotificationItem[];
  const unreadCount = (countQuery.data as number | undefined) ?? 0;

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [items]
  );

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markRead.mutateAsync({ id: item.id });
    }
    const target = targetFromTitle(item.title);
    if (target) setLocation(target);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${unreadCount} notificações não lidas`}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notificações</span>
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} novas</Badge>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={markAll.isPending || unreadCount === 0}
            onClick={() => markAll.mutate()}
          >
            Marcar todas lidas
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Sem notificações.
            </div>
          ) : (
            sorted.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClickItem(item)}
                className={cn(
                  "w-full border-b border-l-4 px-3 py-2 text-left text-sm transition hover:bg-muted/50",
                  severityClass(item.severity),
                  !item.isRead && "bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("font-medium", !item.isRead && "text-foreground")}>
                    {item.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {item.message}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
