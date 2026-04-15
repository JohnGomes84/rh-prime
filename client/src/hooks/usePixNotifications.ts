import { useEffect, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";

import { type SSENotification, useNotifications } from "./useNotifications";

export function usePixNotifications() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const { data: pixRequests } = trpc.portalLider.listPixRequests.useQuery({
    status: "pendente",
  });

  useEffect(() => {
    if (pixRequests) {
      setPendingCount(pixRequests.length);
    }
  }, [pixRequests]);

  useNotifications((message: SSENotification) => {
    setIsConnected(true);

    if (message.type === "pix_request_created") {
      setPendingCount((prev) => prev + 1);
      toast.info(`Nova solicitacao PIX: ${message.data?.employeeName} (${message.data?.employeeCpf})`);
      return;
    }

    if (message.type === "pix_request_reviewed") {
      setPendingCount((prev) => Math.max(0, prev - 1));

      if (message.data?.status === "aprovado") {
        toast.success(`PIX aprovado: ${message.data?.employeeName} por ${message.data?.reviewedByName}`);
      } else {
        toast.warning(`PIX rejeitado: ${message.data?.employeeName} por ${message.data?.reviewedByName}`);
      }
    }
  });

  return {
    pendingCount,
    isConnected,
  };
}
