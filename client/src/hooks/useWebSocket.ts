import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';

/**
 * Hook para conectar ao WebSocket e receber eventos em tempo real
 */
export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
  const { notify } = useNotifications();

  useEffect(() => {
    if (!user?.id) return;

    // Conectar ao WebSocket
    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Entrar na sala do usuário
    socket.emit('join-user', user.id);

    // Eventos de pagamento
    socket.on('payment-approved', (data) => {
      notify({
        type: 'success',
        title: '✅ Pagamento Aprovado',
        message: `Conta #${data.accountNumber} aprovada para pagamento de R$ ${(data.amount / 100).toFixed(2)}`,
      });
    });

    // Eventos de conta paga
    socket.on('account-paid', (data) => {
      notify({
        type: 'success',
        title: '💰 Conta Paga',
        message: `Conta #${data.accountNumber} foi paga com sucesso`,
      });
    });

    // Eventos de PIX adicionado
    socket.on('pix-added', (data) => {
      notify({
        type: 'success',
        title: '🔑 PIX Adicionado',
        message: `Chave PIX adicionada para ${data.employeeName}`,
      });
    });

    // Eventos de planejamento validado
    socket.on('schedule-validated', (data) => {
      notify({
        type: 'success',
        title: '✔️ Planejamento Validado',
        message: `Planejamento #${data.scheduleId} foi validado`,
      });
    });

    // Eventos de conta vencida
    socket.on('overdue-account', (data) => {
      notify({
        type: 'alert',
        title: '⚠️ Conta Vencida',
        message: `Conta #${data.accountNumber} vencida há ${data.daysOverdue} dias`,
      });
    });

    // Eventos de atualização do dashboard
    socket.on('dashboard-update', (data) => {
      // Disparar evento customizado para atualizar dashboard
      window.dispatchEvent(
        new CustomEvent('dashboard-update', { detail: data })
      );
    });

    return () => {
      socket.emit('leave-user', user.id);
      socket.disconnect();
    };
  }, [user?.id, notify]);

  return socketRef.current;
}

/**
 * Hook para usar eventos do WebSocket
 */
export function useWebSocketEvent(
  eventName: string,
  handler: (data: any) => void
) {
  const socket = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName, handler]);
}
