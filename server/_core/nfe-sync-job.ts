import { getDb } from "../db";
import { nfesReceived } from "../../drizzle/schema";
import { eq, and, lt, gte } from "drizzle-orm";
import { broadcastEvent } from "./websocket";
import { sendEmail } from "./email";

/**
 * Job agendado para sincronizar NFes e disparar alertas
 * Executar a cada 6 horas via cron job
 */

export async function syncNfesAndAlerts() {
  console.log("[NFe Sync] Iniciando sincronização de NFes...");

  try {
    const db = getDb();

    // 1. Buscar NFes recebidas não processadas (últimas 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const unprocessedNfes = await db
      .select()
      .from(nfesReceived)
      .where(
        and(
          eq(nfesReceived.status, "received"),
          gte(nfesReceived.createdAt, thirtyDaysAgo)
        )
      );

    console.log(`[NFe Sync] ${unprocessedNfes.length} NFes não processadas encontradas`);

    // 2. Disparar alertas para NFes não processadas
    for (const nfe of unprocessedNfes) {
      // Enviar email de alerta
      await sendEmail({
        to: "admin@empresa.com",
        subject: `NFe Recebida: ${nfe.emitterName}`,
        template: "nfe-received",
        data: {
          emitterName: nfe.emitterName,
          amount: nfe.amount.toFixed(2),
          issueDate: new Date(nfe.issueDate).toLocaleDateString("pt-BR"),
          nfeNumber: nfe.nfeNumber,
          daysOld: Math.floor(
            (new Date().getTime() - new Date(nfe.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        },
      });

      // Emitir evento WebSocket
      broadcastEvent("nfe-alert", {
        nfeNumber: nfe.nfeNumber,
        emitterName: nfe.emitterName,
        amount: nfe.amount,
        daysOld: Math.floor(
          (new Date().getTime() - new Date(nfe.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      });
    }

    // 3. Buscar NFes com vencimento próximo (próximos 7 dias)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingDueNfes = await db
      .select()
      .from(nfesReceived)
      .where(
        and(
          eq(nfesReceived.status, "processed"),
          gte(nfesReceived.dueDate, new Date()),
          lt(nfesReceived.dueDate, nextWeek)
        )
      );

    console.log(
      `[NFe Sync] ${upcomingDueNfes.length} NFes com vencimento próximo`
    );

    // 4. Disparar alertas de vencimento próximo
    for (const nfe of upcomingDueNfes) {
      const daysUntilDue = Math.floor(
        (new Date(nfe.dueDate!).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      await sendEmail({
        to: "admin@empresa.com",
        subject: `NFe Vencendo em ${daysUntilDue} dias: ${nfe.emitterName}`,
        template: "nfe-due-soon",
        data: {
          emitterName: nfe.emitterName,
          amount: nfe.amount.toFixed(2),
          dueDate: new Date(nfe.dueDate!).toLocaleDateString("pt-BR"),
          daysUntilDue,
          nfeNumber: nfe.nfeNumber,
        },
      });

      broadcastEvent("nfe-due-soon", {
        nfeNumber: nfe.nfeNumber,
        emitterName: nfe.emitterName,
        amount: nfe.amount,
        daysUntilDue,
      });
    }

    // 5. Buscar NFes vencidas não reconciliadas
    const overdueNfes = await db
      .select()
      .from(nfesReceived)
      .where(
        and(
          eq(nfesReceived.status, "processed"),
          lt(nfesReceived.dueDate, new Date())
        )
      );

    console.log(`[NFe Sync] ${overdueNfes.length} NFes vencidas encontradas`);

    // 6. Disparar alertas de vencimento
    for (const nfe of overdueNfes) {
      const daysPastDue = Math.floor(
        (new Date().getTime() - new Date(nfe.dueDate!).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      await sendEmail({
        to: "admin@empresa.com",
        subject: `NFe VENCIDA: ${nfe.emitterName} (${daysPastDue} dias)`,
        template: "nfe-overdue",
        data: {
          emitterName: nfe.emitterName,
          amount: nfe.amount.toFixed(2),
          dueDate: new Date(nfe.dueDate!).toLocaleDateString("pt-BR"),
          daysPastDue,
          nfeNumber: nfe.nfeNumber,
        },
      });

      broadcastEvent("nfe-overdue", {
        nfeNumber: nfe.nfeNumber,
        emitterName: nfe.emitterName,
        amount: nfe.amount,
        daysPastDue,
      });
    }

    console.log("[NFe Sync] Sincronização concluída com sucesso");
  } catch (error) {
    console.error("[NFe Sync] Erro durante sincronização:", error);
  }
}

/**
 * Agendar job para executar a cada 6 horas
 * Adicionar ao server/_core/index.ts:
 * 
 * import { syncNfesAndAlerts } from './nfe-sync-job';
 * 
 * // Executar imediatamente na inicialização
 * syncNfesAndAlerts().catch(console.error);
 * 
 * // Agendar para executar a cada 6 horas
 * setInterval(() => {
 *   syncNfesAndAlerts().catch(console.error);
 * }, 6 * 60 * 60 * 1000);
 */
