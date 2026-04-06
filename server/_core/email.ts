import nodemailer from 'nodemailer';
import { ENV } from './env';

let transporter: nodemailer.Transporter | null = null;

/**
 * Inicializar transporter de email
 */
function getTransporter() {
  if (!transporter && ENV.SMTP_HOST && ENV.SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: parseInt(ENV.SMTP_PORT),
      secure: ENV.SMTP_SECURE === 'true',
      auth: ENV.SMTP_USER && ENV.SMTP_PASS
        ? {
            user: ENV.SMTP_USER,
            pass: ENV.SMTP_PASS,
          }
        : undefined,
    });
  }
  return transporter;
}

/**
 * Template: Conta vencida
 */
function overdueAccountTemplate(accountNumber: string, amount: number, daysOverdue: number, clientName: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 4px; text-align: center; }
          .content { padding: 20px; }
          .alert { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Conta Vencida</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Uma conta está vencida e requer atenção imediata.</p>
            <div class="alert">
              <strong>Conta #${accountNumber}</strong><br>
              Cliente: ${clientName}<br>
              Valor: R$ ${(amount / 100).toFixed(2)}<br>
              Vencida há: ${daysOverdue} dias
            </div>
            <p>Por favor, procure regularizar esta situação o quanto antes.</p>
            <a href="https://finhub.example.com/contas?tab=payable&status=overdue" class="button">Ver Contas Vencidas</a>
          </div>
          <div class="footer">
            <p>FinHub Inteligente - Sistema de Gestão Financeira</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Template: Pagamento aprovado
 */
function paymentApprovedTemplate(accountNumber: string, amount: number, employeeName: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; }
          .header { background-color: #16a34a; color: white; padding: 20px; border-radius: 4px; text-align: center; }
          .content { padding: 20px; }
          .success { background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Pagamento Aprovado</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Um pagamento foi aprovado com sucesso.</p>
            <div class="success">
              <strong>Conta #${accountNumber}</strong><br>
              Beneficiário: ${employeeName}<br>
              Valor: R$ ${(amount / 100).toFixed(2)}<br>
              Status: Aprovado
            </div>
            <p>O pagamento será processado em breve.</p>
            <a href="https://finhub.example.com/contas?tab=payable" class="button">Ver Contas</a>
          </div>
          <div class="footer">
            <p>FinHub Inteligente - Sistema de Gestão Financeira</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Template: PIX adicionado
 */
function pixAddedTemplate(employeeName: string, pixKey: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; }
          .header { background-color: #7c3aed; color: white; padding: 20px; border-radius: 4px; text-align: center; }
          .content { padding: 20px; }
          .info { background-color: #f3e8ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 Chave PIX Adicionada</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Uma chave PIX foi adicionada com sucesso.</p>
            <div class="info">
              <strong>Funcionário: ${employeeName}</strong><br>
              Chave PIX: ${pixKey}<br>
              Status: Ativa
            </div>
            <p>Este funcionário agora pode receber pagamentos via PIX.</p>
            <a href="https://finhub.example.com/funcionarios" class="button">Ver Funcionários</a>
          </div>
          <div class="footer">
            <p>FinHub Inteligente - Sistema de Gestão Financeira</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Enviar email de conta vencida
 */
export async function sendOverdueAccountEmail(
  to: string,
  accountNumber: string,
  amount: number,
  daysOverdue: number,
  clientName: string
) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Email] SMTP não configurado');
    return false;
  }

  try {
    await transporter.sendMail({
      from: ENV.SMTP_FROM || 'noreply@finhub.com',
      to,
      subject: `⚠️ Conta Vencida - Conta #${accountNumber}`,
      html: overdueAccountTemplate(accountNumber, amount, daysOverdue, clientName),
    });
    console.log(`[Email] Conta vencida enviado para ${to}`);
    return true;
  } catch (error) {
    console.error('[Email] Erro ao enviar email de conta vencida:', error);
    return false;
  }
}

/**
 * Enviar email de pagamento aprovado
 */
export async function sendPaymentApprovedEmail(
  to: string,
  accountNumber: string,
  amount: number,
  employeeName: string
) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Email] SMTP não configurado');
    return false;
  }

  try {
    await transporter.sendMail({
      from: ENV.SMTP_FROM || 'noreply@finhub.com',
      to,
      subject: `✅ Pagamento Aprovado - Conta #${accountNumber}`,
      html: paymentApprovedTemplate(accountNumber, amount, employeeName),
    });
    console.log(`[Email] Pagamento aprovado enviado para ${to}`);
    return true;
  } catch (error) {
    console.error('[Email] Erro ao enviar email de pagamento aprovado:', error);
    return false;
  }
}

/**
 * Enviar email de PIX adicionado
 */
export async function sendPixAddedEmail(
  to: string,
  employeeName: string,
  pixKey: string
) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Email] SMTP não configurado');
    return false;
  }

  try {
    await transporter.sendMail({
      from: ENV.SMTP_FROM || 'noreply@finhub.com',
      to,
      subject: `🔑 Chave PIX Adicionada - ${employeeName}`,
      html: pixAddedTemplate(employeeName, pixKey),
    });
    console.log(`[Email] PIX adicionado enviado para ${to}`);
    return true;
  } catch (error) {
    console.error('[Email] Erro ao enviar email de PIX adicionado:', error);
    return false;
  }
}
