import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { nfesReceived, InsertNfeReceived } from "../../drizzle/schema";
import { emitDashboardUpdate, broadcastEvent } from "../_core/websocket";

/**
 * Webhook handler para receber notificações de NFes da Focus NFe
 * 
 * Documentação: https://focusnfe.com.br/docs/webhooks
 * 
 * Exemplo de payload:
 * {
 *   "id": "nfe_123456",
 *   "status": "autorizado",
 *   "numero": "000001",
 *   "serie": "1",
 *   "chave_acesso": "35210101234567000123550010000000011234567890",
 *   "data_emissao": "2026-04-06T10:30:00Z",
 *   "valor_total": "1000.00",
 *   "xml": "<NFe>...</NFe>",
 *   "emitente": {
 *     "cnpj": "12345678000123",
 *     "nome": "Empresa Emitente"
 *   },
 *   "destinatario": {
 *     "cnpj": "87654321000198",
 *     "nome": "Empresa Receptora"
 *   }
 * }
 */

export const fiscalWebhookRouter = Router();

/**
 * POST /webhook/focus-nfe
 * Receber notificação de NFe emitida contra o CNPJ da empresa
 */
fiscalWebhookRouter.post("/focus-nfe", async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    // Validar payload
    if (!payload.chave_acesso || !payload.emitente?.cnpj) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const db = getDb();

    // Preparar dados para inserção
    const nfeData: InsertNfeReceived = {
      nfeNumber: payload.chave_acesso,
      emitterCNPJ: payload.emitente.cnpj,
      emitterName: payload.emitente.nome || "Desconhecido",
      receiverCNPJ: payload.destinatario?.cnpj || "",
      amount: parseFloat(payload.valor_total || "0"),
      issueDate: new Date(payload.data_emissao),
      dueDate: payload.data_vencimento ? new Date(payload.data_vencimento) : null,
      description: payload.descricao_operacao || "Nota Fiscal Eletrônica",
      status: "received",
      nfeType: payload.tipo_documento === "nfce" ? "nfce" : "nfe",
      xmlUrl: payload.xml_url,
      focusNfeId: payload.id,
      notes: `Recebida via webhook Focus NFe em ${new Date().toISOString()}`,
    };

    // Inserir ou atualizar NFe
    await db
      .insert(nfesReceived)
      .values(nfeData)
      .onDuplicateKeyUpdate({
        set: {
          ...nfeData,
          updatedAt: new Date(),
        },
      });

    console.log(`[Webhook] NFe recebida: ${payload.chave_acesso}`);

    // Emitir evento para dashboard em tempo real
    broadcastEvent("nfe-received", {
      nfeNumber: payload.chave_acesso,
      emitterName: payload.emitente.nome,
      amount: payload.valor_total,
      timestamp: new Date().toISOString(),
    });

    // Responder com sucesso
    res.json({ success: true, message: "NFe processada com sucesso" });
  } catch (error) {
    console.error("[Webhook] Erro ao processar NFe:", error);
    res.status(500).json({ error: "Erro ao processar NFe" });
  }
});

/**
 * POST /webhook/focus-nfe-status
 * Receber atualização de status da NFe (autorizado, rejeitado, cancelado)
 */
fiscalWebhookRouter.post("/focus-nfe-status", async (req: Request, res: Response) => {
  try {
    const { chave_acesso, status, motivo } = req.body;

    if (!chave_acesso) {
      return res.status(400).json({ error: "Chave de acesso ausente" });
    }

    const db = getDb();

    // Mapear status da Focus para nosso status
    let nfeStatus: "received" | "processed" | "reconciled" | "rejected" = "received";
    if (status === "autorizado") nfeStatus = "processed";
    if (status === "rejeitado" || status === "cancelado") nfeStatus = "rejected";

    // Atualizar status da NFe
    await db
      .update(nfesReceived)
      .set({
        status: nfeStatus,
        notes: motivo ? `Status: ${status} - ${motivo}` : `Status: ${status}`,
        updatedAt: new Date(),
      })
      .where((t) => t.nfeNumber.eq(chave_acesso));

    console.log(`[Webhook] Status da NFe atualizado: ${chave_acesso} -> ${status}`);

    // Emitir evento
    broadcastEvent("nfe-status-updated", {
      nfeNumber: chave_acesso,
      status,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: "Status atualizado com sucesso" });
  } catch (error) {
    console.error("[Webhook] Erro ao atualizar status:", error);
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

export default fiscalWebhookRouter;
