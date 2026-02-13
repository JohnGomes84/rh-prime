/**
 * Serviço de email para notificações
 * Integra com SendGrid ou similar
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Enviar email de notificação
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
    
    if (!apiKey) {
      console.warn('Email API key não configurada');
      return false;
    }

    // Implementação com SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject,
          },
        ],
        from: {
          email: options.from || 'noreply@rhprime.com',
        },
        content: [
          {
            type: 'text/html',
            value: options.html,
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

/**
 * Template de email para ASO vencendo
 */
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

/**
 * Template de email para férias aprovadas
 */
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

/**
 * Enviar notificação de evento crítico
 */
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
