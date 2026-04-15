import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface SSENotification {
  type: "pix_request_created" | "attendance_closed" | "pix_request_reviewed" | "duplicate_allocation_detected" | "alert" | "success" | "warning" | "error";
  data: Record<string, any>;
  timestamp: string;
  title?: string;
  message?: string;
  actionUrl?: string;
}

type LocalNotification = Pick<SSENotification, "type" | "title" | "message" | "actionUrl"> & {
  data?: Record<string, any>;
};

function emitToast(notification: SSENotification | LocalNotification) {
  switch (notification.type) {
    case "pix_request_created":
      toast.info(`Nova solicitacao de PIX: ${notification.data?.employeeName}`);
      break;
    case "attendance_closed":
      toast.info(`Presenca fechada: ${notification.data?.totalPeople} diaristas em ${notification.data?.clientName}`);
      break;
    case "pix_request_reviewed":
      if (notification.data?.status === "aprovado") {
        toast.success(`PIX de ${notification.data?.employeeName} foi aprovado`);
      } else {
        toast.error(`PIX de ${notification.data?.employeeName} foi rejeitado`);
      }
      break;
    case "duplicate_allocation_detected":
      toast.warning(`Alocacao duplicada detectada: ${notification.data?.employeeName}`);
      break;
    case "success":
      toast.success(notification.title || notification.message);
      break;
    case "warning":
      toast.warning(notification.title || notification.message);
      break;
    case "error":
      toast.error(notification.title || notification.message);
      break;
    case "alert":
      toast.info(notification.title || notification.message);
      break;
  }
}

export function useNotifications(onNotification?: (notif: SSENotification) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) return;

    try {
      const eventSource = new EventSource("/api/notifications/stream");

      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);

          if (notification.type === "connected") {
            console.log("Conectado ao stream de notificacoes");
            return;
          }

          // Disparar callback customizado
          if (onNotification) {
            onNotification(notification);
          }

          emitToast(notification);
        } catch (error) {
          console.error("Erro ao processar notificacao:", error);
        }
      };

      eventSource.onerror = () => {
        console.error("Erro no stream de notificacoes");
        eventSource.close();
        eventSourceRef.current = null;
        // Reconectar apos 5 segundos
        setTimeout(connect, 5000);
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error("Erro ao conectar ao stream de notificacoes:", error);
    }
  }, [onNotification]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const notify = useCallback((notification: LocalNotification) => {
    emitToast(notification);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { connect, disconnect, notify };
}
