import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getDb } from '../db';

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
  const db = await getDb();
  if (!db) return;

  // Salvar no banco de dados
  if (payload.userId) {
    await db.createNotification({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: JSON.stringify(payload.data || {}),
      read: false,
    });
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
  const db = await getDb();
  if (!db) return;

  // Buscar todos os usuários com esse role
  const users = await db.getUsersByRole(role);

  for (const user of users) {
    await broadcastNotification({
      ...payload,
      userId: user.id,
    });
  }
}

export async function broadcastToDepartment(departmentId: string, payload: NotificationPayload) {
  const db = await getDb();
  if (!db) return;

  // Buscar todos os usuários do departamento
  const users = await db.getUsersByDepartment(departmentId);

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
