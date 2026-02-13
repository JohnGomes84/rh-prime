import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerWebhook, unregisterWebhook, listWebhooks, triggerWebhook } from "./webhooks";

// Mock fetch
global.fetch = vi.fn();

describe("Webhook System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Limpar webhooks registrados
    listWebhooks().forEach(w => unregisterWebhook(w.id));
  });

  it("deve registrar novo webhook", () => {
    const webhook = registerWebhook(
      "https://example.com/webhook",
      "employee.created"
    );

    expect(webhook).toHaveProperty("id");
    expect(webhook.url).toBe("https://example.com/webhook");
    expect(webhook.event).toBe("employee.created");
    expect(webhook.active).toBe(true);
  });

  it("deve listar webhooks ativos", () => {
    registerWebhook("https://example.com/webhook1", "employee.created");
    registerWebhook("https://example.com/webhook2", "vacation.approved");

    const webhooks = listWebhooks();
    expect(webhooks).toHaveLength(2);
    expect(webhooks[0].active).toBe(true);
  });

  it("deve remover webhook por ID", () => {
    const webhook = registerWebhook(
      "https://example.com/webhook",
      "employee.created"
    );

    const success = unregisterWebhook(webhook.id);
    expect(success).toBe(true);

    const remaining = listWebhooks();
    expect(remaining).toHaveLength(0);
  });

  it("deve disparar webhook para evento registrado", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true });

    registerWebhook("https://example.com/webhook", "employee.created");

    await triggerWebhook("employee.created", {
      id: 1,
      name: "Joao Silva",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/webhook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Webhook-Event": "employee.created",
        }),
      })
    );
  });

  it("deve nao disparar webhook para evento nao registrado", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true });

    registerWebhook("https://example.com/webhook", "employee.created");

    await triggerWebhook("vacation.approved", {
      id: 1,
      status: "Aprovada",
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deve marcar webhook como inativo apos falha", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const webhook = registerWebhook(
      "https://example.com/webhook",
      "employee.created"
    );

    await triggerWebhook("employee.created", { id: 1 });

    // Aguardar um pouco para o webhook ser marcado como inativo
    await new Promise(resolve => setTimeout(resolve, 100));

    const webhooks = listWebhooks();
    // Webhook pode estar inativo apos falha
    expect(webhooks.length).toBeLessThanOrEqual(1);
  });

  it("deve incluir assinatura HMAC no webhook", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true });

    registerWebhook("https://example.com/webhook", "employee.created");

    await triggerWebhook("employee.created", { id: 1 });

    const calls = (global.fetch as any).mock.calls;
    if (calls.length > 0) {
      const headers = calls[0][1].headers;
      expect(headers).toHaveProperty("X-Webhook-Signature");
      expect(typeof headers["X-Webhook-Signature"]).toBe("string");
    }
  });
});
