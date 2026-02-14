import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, generateASOExpiringEmail, generateVacationApprovedEmail, notifyCriticalEvent } from "./email-service";

// Mock fetch
global.fetch = vi.fn();

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve enviar email com sucesso quando API key está configurada", async () => {
    process.env.SENDGRID_API_KEY = "test-api-key";
    (global.fetch).mockResolvedValueOnce({ ok: true });

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>Test content</p>",
    });

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.sendgrid.com/v3/mail/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("deve retornar false quando API key não está configurada", async () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.EMAIL_API_KEY;

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>Test content</p>",
    });

    expect(result).toBe(false);
  });

  it("deve retornar false quando API retorna erro", async () => {
    process.env.SENDGRID_API_KEY = "test-api-key";
    (global.fetch).mockResolvedValueOnce({ ok: false });

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>Test content</p>",
    });

    expect(result).toBe(false);
  });

  it("deve gerar template de email para ASO vencendo", () => {
    const html = generateASOExpiringEmail("João Silva", 7);
    expect(html).toContain("João Silva");
    expect(html).toContain("7 dias");
    expect(html).toContain("ASO");
  });

  it("deve gerar template de email para férias aprovadas", () => {
    const html = generateVacationApprovedEmail("Maria Santos", "2026-03-01", "2026-03-15");
    expect(html).toContain("Maria Santos");
    expect(html).toContain("2026-03-01");
    expect(html).toContain("2026-03-15");
    expect(html).toContain("Férias Aprovadas");
  });

  it("deve notificar evento crítico com detalhes", async () => {
    process.env.SENDGRID_API_KEY = "test-api-key";
    (global.fetch).mockResolvedValueOnce({ ok: true });

    const result = await notifyCriticalEvent(
      "ASO Vencido",
      { employeeId: 1, employeeName: "João Silva" },
      "admin@example.com"
    );

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
  });
});
