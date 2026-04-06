import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { EventEmitter } from "events";

// Emitter global para notificações em tempo real
export const notificationEmitter = new EventEmitter();

// Tipo de notificação
export type Notification = {
  userId: number | 'all';
  type: 'alert' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: Date;
};

export const notificationsRouter = router({
  /**
   * Enviar notificação (uso interno)
   */
  send: protectedProcedure
    .input(
      z.object({
        userId: z.number().or(z.literal('all')),
        type: z.enum(['alert', 'success', 'warning', 'error']),
        title: z.string(),
        message: z.string(),
        actionUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const notification: Notification = {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        timestamp: new Date(),
      };

      notificationEmitter.emit('notification', notification);
      return { success: true };
    }),

  /**
   * Notificação de alerta: Conta vencida
   */
  notifyOverdueAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        amount: z.number(),
        daysOverdue: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const notification: Notification = {
        userId: 'all',
        type: 'warning',
        title: '⚠️ Conta Vencida',
        message: `Conta #${input.accountId} vencida há ${input.daysOverdue} dias (R$ ${(input.amount / 100).toFixed(2)})`,
        actionUrl: `/contas?tab=payable&status=overdue`,
        timestamp: new Date(),
      };

      notificationEmitter.emit('notification', notification);
      return { success: true };
    }),

  /**
   * Notificação de sucesso: Pagamento realizado
   */
  notifyPaymentSuccess: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        amount: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const notification: Notification = {
        userId: 'all',
        type: 'success',
        title: '✅ Pagamento Realizado',
        message: `Conta #${input.accountId} paga com sucesso (R$ ${(input.amount / 100).toFixed(2)})`,
        actionUrl: `/contas?tab=payable`,
        timestamp: new Date(),
      };

      notificationEmitter.emit('notification', notification);
      return { success: true };
    }),

  /**
   * Notificação: Planejamento validado
   */
  notifyScheduleValidated: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        employeeCount: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const notification: Notification = {
        userId: 'all',
        type: 'success',
        title: '✅ Planejamento Validado',
        message: `Planejamento #${input.scheduleId} validado com ${input.employeeCount} diarista(s)`,
        actionUrl: `/planejamentos`,
        timestamp: new Date(),
      };

      notificationEmitter.emit('notification', notification);
      return { success: true };
    }),

  /**
   * Notificação: PIX adicionado
   */
  notifyPixAdded: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        employeeName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const notification: Notification = {
        userId: 'all',
        type: 'success',
        title: '✅ Chave PIX Adicionada',
        message: `${input.employeeName} agora pode receber pagamentos via PIX`,
        actionUrl: `/funcionarios`,
        timestamp: new Date(),
      };

      notificationEmitter.emit('notification', notification);
      return { success: true };
    }),
});
