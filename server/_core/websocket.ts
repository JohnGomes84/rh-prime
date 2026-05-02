import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import * as dbHelpers from '../db';

interface NotificationPayload {
  type: 'approval' | 'alert' | 'info' | 'error';
  title: string;
  message: string;
  userId?: string;
  data?: Record<string, any>;
  timestamp: number;
}

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
}

const clients = new Map<string, ClientConnection>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      ws.close(1008, 'Missing userId');
      return;
    }

    const client: ClientConnection = { ws, userId, isAlive: true };
    clients.set(userId, client);

    console.log(`[WebSocket] User ${userId} connected. Total: ${clients.size}`);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('close', () => {
      clients.delete(userId);
      console.log(`[WebSocket] User ${userId} disconnected. Total: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for user ${userId}:`, error);
      clients.delete(userId);
    });
  });

  // Heartbeat para manter conexões vivas
  setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client.userId);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000);

  return wss;
}

export async function broadcastNotification(payload: NotificationPayload) {
  // Salvar no banco de dados via audit log
  if (payload.userId) {
    try {
      await dbHelpers.createAuditEntry({
        action: 'notification',
        resourceType: payload.type,
        resourceId: payload.userId,
        userId: payload.userId as any,
        details: JSON.stringify({ title: payload.title, message: payload.message, data: payload.data }),
      } as any);
    } catch (e) { /* ignore */ }
  }

  // Enviar via WebSocket se usuário está conectado
  if (payload.userId && clients.has(payload.userId)) {
    const client = clients.get(payload.userId)!;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(payload));
    }
  }
}

export async function broadcastToRole(role: string, payload: NotificationPayload) {
  try {
    const users = await dbHelpers.listUsers();
    const filtered = users.filter((u: any) => u.role === role);
    for (const user of filtered) {
      await broadcastNotification({
        ...payload,
        userId: String(user.id),
      });
    }
  } catch (e) { /* ignore */ }
}

export async function broadcastToDepartment(departmentId: string, payload: NotificationPayload) {
  // Broadcast to all connected clients (department filter not available)
  const users: any[] = [];
  for (const user of users) {
    await broadcastNotification({
      ...payload,
      userId: user.id,
    });
  }
}

export function getConnectedUsers(): string[] {
  return Array.from(clients.keys());
}

export function isUserConnected(userId: string): boolean {
  return clients.has(userId);
}
