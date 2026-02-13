/**
 * Sistema de Webhooks para eventos críticos do RH Prime
 * Permite integração com sistemas externos
 */

export type WebhookEvent =
  | 'employee.created'
  | 'employee.updated'
  | 'employee.deleted'
  | 'vacation.requested'
  | 'vacation.approved'
  | 'vacation.rejected'
  | 'aso.expiring'
  | 'pgr.expiring'
  | 'pcmso.expiring'
  | 'critical.alert';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  data: Record<string, any>;
}

interface WebhookSubscription {
  id: string;
  url: string;
  event: WebhookEvent;
  active: boolean;
  createdAt: Date;
}

const webhookSubscriptions: Map<string, WebhookSubscription> = new Map();

/**
 * Registrar novo webhook
 */
export function registerWebhook(
  url: string,
  event: WebhookEvent
): WebhookSubscription {
  const id = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const subscription: WebhookSubscription = {
    id,
    url,
    event,
    active: true,
    createdAt: new Date(),
  };

  webhookSubscriptions.set(id, subscription);
  return subscription;
}

/**
 * Disparar webhook
 */
export async function triggerWebhook(
  event: WebhookEvent,
  data: Record<string, any>
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: Date.now(),
    data,
  };

  // Encontrar todos os webhooks para este evento
  webhookSubscriptions.forEach(async (subscription) => {
    if (subscription.event === event && subscription.active) {
      try {
        await fetch(subscription.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            'X-Webhook-Signature': generateSignature(payload),
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error(`Erro ao disparar webhook para ${subscription.url}:`, error);
        // Marcar como inativo após falhas repetidas
        subscription.active = false;
      }
    }
  });
}

/**
 * Gerar assinatura HMAC para validar webhook
 */
function generateSignature(payload: WebhookPayload): string {
  const crypto = require('crypto');
  const secret = process.env.WEBHOOK_SECRET || 'webhook-secret';
  
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

/**
 * Remover webhook
 */
export function unregisterWebhook(id: string): boolean {
  return webhookSubscriptions.delete(id);
}

/**
 * Listar webhooks ativos
 */
export function listWebhooks(): WebhookSubscription[] {
  return Array.from(webhookSubscriptions.values()).filter(w => w.active);
}

/**
 * Exemplo de uso em evento de criação de funcionário
 */
export async function onEmployeeCreated(employeeData: Record<string, any>) {
  await triggerWebhook('employee.created', {
    employee: employeeData,
    action: 'created',
  });
}

/**
 * Exemplo de uso em evento de ASO vencendo
 */
export async function onASOExpiring(employeeId: number, daysUntilExpiry: number) {
  await triggerWebhook('aso.expiring', {
    employeeId,
    daysUntilExpiry,
    severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
  });
}
