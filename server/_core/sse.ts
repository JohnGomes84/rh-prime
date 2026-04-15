import { Express, Request, Response } from "express";
import { sdk } from "./sdk";
import { notificationEmitter, type Notification } from "../routers/notifications";

type SSEClient = {
  userId: number;
  res: Response;
  connected: boolean;
};

const clients = new Map<number, SSEClient[]>();
let notificationBridgeInitialized = false;

function writeEvent(res: Response, event: unknown) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function dispatchEvent(targetUserId: number | "all", event: Record<string, unknown>) {
  if (targetUserId === "all") {
    clients.forEach((userClients) => {
      userClients.forEach((client) => {
        if (client.connected) {
          try {
            writeEvent(client.res, event);
          } catch (error) {
            console.error("[SSE] Error sending to client:", error);
            client.connected = false;
          }
        }
      });
    });
    return;
  }

  const userClients = clients.get(targetUserId);
  if (!userClients) return;

  userClients.forEach((client) => {
    if (client.connected) {
      try {
        writeEvent(client.res, event);
      } catch (error) {
        console.error("[SSE] Error sending to client:", error);
        client.connected = false;
      }
    }
  });
}

function initializeNotificationBridge() {
  if (notificationBridgeInitialized) return;

  notificationEmitter.on("notification", (notification: Notification) => {
    dispatchEvent(notification.userId, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      timestamp: notification.timestamp.toISOString(),
      data: {},
    });
  });

  notificationBridgeInitialized = true;
}

export function setupSSE(app: Express) {
  initializeNotificationBridge();

  app.get("/api/notifications/stream", async (req: Request, res: Response) => {
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch (error) {
        user = null;
      }
      if (!user) {
        res.status(401).end();
        return;
      }

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Register client
      const client: SSEClient = { userId: user.id, res, connected: true };
      if (!clients.has(user.id)) {
        clients.set(user.id, []);
      }
      clients.get(user.id)!.push(client);

      // Send initial connection message
      writeEvent(res, { type: "connected" });

      // Send ping every 30s to keep connection alive
      const pingInterval = setInterval(() => {
        if (client.connected) {
          res.write(":\n");
        }
      }, 30000);

      // Handle client disconnect
      req.on("close", () => {
        client.connected = false;
        clearInterval(pingInterval);
        const userClients = clients.get(user.id);
        if (userClients) {
          const index = userClients.indexOf(client);
          if (index > -1) {
            userClients.splice(index, 1);
          }
        }
      });
    } catch (error) {
      console.error("[SSE] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

export function notifyAdmins(event: {
  type:
    | "pix_request_created"
    | "pix_request_reviewed"
    | "attendance_closed"
    | "duplicate_allocation_detected"
    | "alert"
    | "success"
    | "warning"
    | "error";
  data: Record<string, any>;
}) {
  dispatchEvent("all", { ...event, timestamp: new Date().toISOString() });
}

export function notifyUser(userId: number, event: {
  type: string;
  data: Record<string, any>;
}) {
  dispatchEvent(userId, { ...event, timestamp: new Date().toISOString() });
}
