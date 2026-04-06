import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { getDb } from '../db';
import { logAudit } from '../routers/audit';

let io: Server | null = null;

/**
 * Inicializar Socket.io
 */
export function initializeWebSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Cliente conectado: ${socket.id}`);

    // Juntar sala do usuário
    socket.on('join-user', (userId: number) => {
      socket.join(`user-${userId}`);
      console.log(`[WebSocket] Usuário ${userId} entrou na sala`);
    });

    // Sair da sala
    socket.on('leave-user', (userId: number) => {
      socket.leave(`user-${userId}`);
      console.log(`[WebSocket] Usuário ${userId} saiu da sala`);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Obter instância do Socket.io
 */
export function getWebSocket(): Server | null {
  return io;
}

/**
 * Emitir evento de pagamento aprovado
 */
export function emitPaymentApproved(userId: number, data: any) {
  if (!io) return;
  io.to(`user-${userId}`).emit('payment-approved', data);
  console.log(`[WebSocket] Evento "payment-approved" emitido para usuário ${userId}`);
}

/**
 * Emitir evento de conta paga
 */
export function emitAccountPaid(userId: number, data: any) {
  if (!io) return;
  io.to(`user-${userId}`).emit('account-paid', data);
  console.log(`[WebSocket] Evento "account-paid" emitido para usuário ${userId}`);
}

/**
 * Emitir evento de PIX adicionado
 */
export function emitPixAdded(userId: number, data: any) {
  if (!io) return;
  io.to(`user-${userId}`).emit('pix-added', data);
  console.log(`[WebSocket] Evento "pix-added" emitido para usuário ${userId}`);
}

/**
 * Emitir evento de planejamento validado
 */
export function emitScheduleValidated(userId: number, data: any) {
  if (!io) return;
  io.to(`user-${userId}`).emit('schedule-validated', data);
  console.log(`[WebSocket] Evento "schedule-validated" emitido para usuário ${userId}`);
}

/**
 * Emitir evento de conta vencida
 */
export function emitOverdueAccount(userId: number, data: any) {
  if (!io) return;
  io.to(`user-${userId}`).emit('overdue-account', data);
  console.log(`[WebSocket] Evento "overdue-account" emitido para usuário ${userId}`);
}

/**
 * Emitir atualização de KPIs do dashboard
 */
export function emitDashboardUpdate(userId: number, data: any) {
  if (!io) return;
  io.to(`user-${userId}`).emit('dashboard-update', data);
  console.log(`[WebSocket] Evento "dashboard-update" emitido para usuário ${userId}`);
}

/**
 * Broadcast para todos os usuários
 */
export function broadcastEvent(event: string, data: any) {
  if (!io) return;
  io.emit(event, data);
  console.log(`[WebSocket] Evento "${event}" enviado para todos os usuários`);
}
