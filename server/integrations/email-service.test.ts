import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateASOExpiringEmail,
  generateKanbanAssignmentEmail,
  generateKanbanDeadlineEmail,
  generateVacationApprovedEmail,
  notifyCriticalEvent,
  sendEmail,
} from "./email-service.js";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: (...args: any[]) => sendMock(...args),
    },
  })),
}));

describe("Email Service (Resend)", () => {
  beforeEach(() => {
    sendMock.mockReset();
    delete process.env.RESEND_API_KEY;
  });

  it("retorna false quando RESEND_API_KEY não está configurada", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>Test content</p>",
    });
    expect(result).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("envia email com From/Reply-To default quando RESEND_API_KEY presente", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "noreply@mlservicoseco.com.br";
    process.env.EMAIL_REPLY_TO = "adm@mlservicoseco.com.br";
    sendMock.mockResolvedValueOnce({ data: { id: "abc-123" }, error: null });

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>hi</p>",
    });

    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@mlservicoseco.com.br",
        to: ["user@example.com"],
        replyTo: "adm@mlservicoseco.com.br",
        subject: "Test",
      })
    );
  });

  it("retorna false quando Resend devolve error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "rate_limit" } });

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>hi</p>",
    });

    expect(result).toBe(false);
  });

  it("gera template ASO", () => {
    const html = generateASOExpiringEmail("João Silva", 7);
    expect(html).toContain("João Silva");
    expect(html).toContain("7 dias");
    expect(html).toContain("ASO");
  });

  it("gera template férias aprovadas", () => {
    const html = generateVacationApprovedEmail("Maria Santos", "2026-03-01", "2026-03-15");
    expect(html).toContain("Maria Santos");
    expect(html).toContain("2026-03-01");
    expect(html).toContain("2026-03-15");
    expect(html).toContain("Férias Aprovadas");
  });

  it("gera template kanban assignment com prazo", () => {
    const html = generateKanbanAssignmentEmail({
      assigneeName: "Ana",
      cardTitle: "Revisar contrato",
      boardName: "RH Operacional",
      dueDate: "2026-05-20",
      cardUrl: "https://app/kanban/1?card=2",
    });
    expect(html).toContain("Ana");
    expect(html).toContain("Revisar contrato");
    expect(html).toContain("RH Operacional");
    expect(html).toContain("2026-05-20");
    expect(html).toContain("https://app/kanban/1?card=2");
  });

  it("gera template kanban deadline (overdue)", () => {
    const html = generateKanbanDeadlineEmail({
      assigneeName: "Carlos",
      cardTitle: "Aprovar PR",
      boardName: "Dev",
      dueDate: "2026-05-13",
      overdue: true,
      cardUrl: "https://app/kanban/2?card=5",
    });
    expect(html).toContain("Carlos");
    expect(html).toContain("Tarefa atrasada");
    expect(html).toContain("vencido");
  });

  it("notifyCriticalEvent envia via Resend", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValueOnce({ data: { id: "x" }, error: null });

    const result = await notifyCriticalEvent(
      "ASO Vencido",
      { employeeId: 1, employeeName: "João Silva" },
      "admin@example.com"
    );

    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalled();
    expect(sendMock.mock.calls[0][0].subject).toContain("CRÍTICO");
  });
});
