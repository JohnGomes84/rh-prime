import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import * as db from '../db.js';
import { sdk } from './sdk.js';

interface NotificationPayload {
  type: 'approval' | 'alert' | 'info' | 'error' | 'Geral' | 'Férias' | 'ASO' | 'Banco de Horas';
  title: string;
  message: string;
  userId?: number;
  data?: Record<string, any>;
  timestamp?: number;
}

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
}

const clients = new Map<string, ClientConnection>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', async (ws: WebSocket, req) => {
    let userId: string;
    try {
      const user = await sdk.authenticateRequest(req as any);
      userId = String(user.id);
    } catch {
      ws.close(1008, 'Unauthorized');
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

const DB_NOTIFICATION_TYPES = new Set(['Férias', 'ASO', 'Banco de Horas', 'Contrato Experiência', 'Treinamento', 'Documento', 'EPI', 'Geral']);

export async function broadcastNotification(payload: NotificationPayload) {
  // DB persistence is handled by the caller (e.g. notifyKanbanCardAssignment).
  // This function only pushes the payload over WebSocket.

  const key = payload.userId !== undefined ? String(payload.userId) : '';
  if (key && clients.has(key)) {
    const client = clients.get(key)!;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ ...payload, timestamp: payload.timestamp ?? Date.now() }));
    }
  }
}

export async function broadcastToRole(role: string, payload: NotificationPayload) {
  const usersList = await db.getUsersByRole(role);
  for (const user of usersList) {
    await broadcastNotification({ ...payload, userId: user.id });
  }
}

export async function broadcastToDepartment(departmentId: string, payload: NotificationPayload) {
  const usersList = await db.getUsersByDepartment(departmentId);
  for (const user of usersList) {
    await broadcastNotification({ ...payload, userId: user.id });
  }
}

export function getConnectedUsers(): string[] {
  return Array.from(clients.keys());
}

export function isUserConnected(userId: string): boolean {
  return clients.has(userId);
}
