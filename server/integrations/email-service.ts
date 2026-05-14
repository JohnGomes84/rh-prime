/**
 * Serviço de email via Resend (substitui SendGrid).
 * From e Reply-To configuráveis via env, com defaults razoáveis.
 */

import { Resend } from "resend";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

const DEFAULT_FROM = process.env.EMAIL_FROM ?? "noreply@mlservicoseco.com.br";
const DEFAULT_REPLY_TO = process.env.EMAIL_REPLY_TO ?? "adm@mlservicoseco.com.br";

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY ausente — envio desabilitado");
    return null;
  }
  _client = new Resend(apiKey);
  return _client;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { data, error } = await client.emails.send({
      from: options.from ?? DEFAULT_FROM,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo ?? DEFAULT_REPLY_TO,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return false;
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("[email] sent id=", data?.id, "to=", options.to);
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

export function generateASOExpiringEmail(
  employeeName: string,
  daysUntilExpiry: number
): string {
  return `
    <h2>Notificação: ASO Vencendo</h2>
    <p>Olá,</p>
    <p>O ASO do funcionário <strong>${employeeName}</strong> vencerá em <strong>${daysUntilExpiry} dias</strong>.</p>
    <p>Por favor, agende uma nova avaliação.</p>
    <p>Atenciosamente,<br>RH Prime</p>
  `;
}

export function generateVacationApprovedEmail(
  employeeName: string,
  startDate: string,
  endDate: string
): string {
  return `
    <h2>Férias Aprovadas</h2>
    <p>Olá ${employeeName},</p>
    <p>Suas férias foram aprovadas!</p>
    <p><strong>Período:</strong> ${startDate} a ${endDate}</p>
    <p>Aproveite bem!</p>
    <p>Atenciosamente,<br>RH Prime</p>
  `;
}

export function generateKanbanAssignmentEmail(input: {
  assigneeName: string;
  cardTitle: string;
  boardName: string;
  dueDate?: string | null;
  cardUrl: string;
}): string {
  const due = input.dueDate
    ? `<p><strong>Prazo:</strong> ${input.dueDate}</p>`
    : "";
  return `
    <h2>Nova tarefa atribuída</h2>
    <p>Olá ${input.assigneeName},</p>
    <p>Você foi designado para a tarefa <strong>${input.cardTitle}</strong> no quadro <em>${input.boardName}</em>.</p>
    ${due}
    <p><a href="${input.cardUrl}">Abrir tarefa</a></p>
    <p>Atenciosamente,<br>RH Prime</p>
  `;
}

export function generateKanbanDeadlineEmail(input: {
  assigneeName: string;
  cardTitle: string;
  boardName: string;
  dueDate: string;
  overdue: boolean;
  cardUrl: string;
}): string {
  const headline = input.overdue ? "Tarefa atrasada" : "Tarefa vence amanhã";
  return `
    <h2>${headline}: ${input.cardTitle}</h2>
    <p>Olá ${input.assigneeName},</p>
    <p>Quadro: <em>${input.boardName}</em></p>
    <p><strong>Prazo:</strong> ${input.dueDate}${input.overdue ? " (vencido)" : ""}</p>
    <p><a href="${input.cardUrl}">Abrir tarefa</a></p>
    <p>Atenciosamente,<br>RH Prime</p>
  `;
}

export async function notifyCriticalEvent(
  event: string,
  details: Record<string, any>,
  adminEmail: string
): Promise<boolean> {
  const html = `
    <h2>Alerta Crítico: ${event}</h2>
    <pre>${JSON.stringify(details, null, 2)}</pre>
    <p>Verifique o sistema imediatamente.</p>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `[CRÍTICO] ${event}`,
    html,
  });
}
