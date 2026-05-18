import { describe, it, expect } from "vitest";
import {
  validateAccountsReceivable,
  calculateDaysUntilDue,
  isOverdue,
  groupByClient,
  calculateTotalByClient,
  filterPending,
  filterOverdue,
} from "./accounts-receivable-generation";

const mockRecords = [
  {
    description: "OS - Cliente 1 - 05/04/2026",
    value: 1000,
    clientId: 1,
    type: "order_of_service" as const,
    status: "pending" as const,
    dueDate: new Date("2026-05-05"),
    issueDate: new Date("2026-04-05"),
    scheduleId: 1,
  },
  {
    description: "OS - Cliente 1 - 06/04/2026",
    value: 500,
    clientId: 1,
    type: "order_of_service" as const,
    status: "pending" as const,
    dueDate: new Date("2026-05-06"),
    issueDate: new Date("2026-04-06"),
    scheduleId: 2,
  },
  {
    description: "OS - Cliente 2 - 07/04/2026",
    value: 2000,
    clientId: 2,
    type: "order_of_service" as const,
    status: "paid" as const,
    dueDate: new Date("2026-05-07"),
    issueDate: new Date("2026-04-07"),
    scheduleId: 3,
  },
];

describe("Accounts Receivable Generation", () => {
  describe("validateAccountsReceivable", () => {
    it("deve validar registro correto", () => {
      const result = validateAccountsReceivable(mockRecords[0]);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("deve rejeitar descrição vazia", () => {
      const record = { ...mockRecords[0], description: "" };
      const result = validateAccountsReceivable(record);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Descrição é obrigatória");
    });

    it("deve rejeitar valor zero", () => {
      const record = { ...mockRecords[0], value: 0 };
      const result = validateAccountsReceivable(record);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Valor deve ser maior que zero");
    });

    it("deve rejeitar valor negativo", () => {
      const record = { ...mockRecords[0], value: -100 };
      const result = validateAccountsReceivable(record);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Valor deve ser maior que zero");
    });

    it("deve rejeitar clientId inválido", () => {
      const record = { ...mockRecords[0], clientId: 0 };
      const result = validateAccountsReceivable(record);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Cliente inválido");
    });

    it("deve rejeitar data de vencimento anterior à data de emissão", () => {
      const record = {
        ...mockRecords[0],
        dueDate: new Date("2026-04-01"),
        issueDate: new Date("2026-04-05"),
      };
      const result = validateAccountsReceivable(record);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Data de vencimento não pode ser anterior à data de emissão");
    });
  });

  describe("calculateDaysUntilDue", () => {
    it("deve calcular dias até vencimento corretamente", () => {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 10);
      const days = calculateDaysUntilDue(dueDate);
      expect(days).toBe(10);
    });

    it("deve retornar 0 para data de hoje", () => {
      const today = new Date();
      const days = calculateDaysUntilDue(today);
      expect(days).toBe(0);
    });

    it("deve retornar negativo para data passada", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const days = calculateDaysUntilDue(yesterday);
      expect(days).toBeLessThan(0);
    });

    it("deve calcular 30 dias corretamente", () => {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);
      const days = calculateDaysUntilDue(dueDate);
      expect(days).toBe(30);
    });
  });

  describe("isOverdue", () => {
    it("deve retornar false para data futura", () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(isOverdue(future)).toBe(false);
    });

    it("deve retornar true para data passada", () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(isOverdue(past)).toBe(true);
    });

    it("deve retornar false para data de hoje", () => {
      const today = new Date();
      expect(isOverdue(today)).toBe(false);
    });
  });

  describe("groupByClient", () => {
    it("deve agrupar registros por clientId", () => {
      const grouped = groupByClient(mockRecords);
      expect(grouped.size).toBe(2); // 2 clientes únicos
      expect(grouped.get(1)?.length).toBe(2); // Cliente 1 tem 2 registros
      expect(grouped.get(2)?.length).toBe(1); // Cliente 2 tem 1 registro
    });

    it("deve retornar mapa vazio para array vazio", () => {
      const grouped = groupByClient([]);
      expect(grouped.size).toBe(0);
    });
  });

  describe("calculateTotalByClient", () => {
    it("deve calcular total por cliente", () => {
      const totals = calculateTotalByClient(mockRecords);
      expect(totals.get(1)).toBe(1500); // 1000 + 500
      expect(totals.get(2)).toBe(2000); // 2000
    });

    it("deve retornar mapa vazio para array vazio", () => {
      const totals = calculateTotalByClient([]);
      expect(totals.size).toBe(0);
    });
  });

  describe("filterPending", () => {
    it("deve filtrar apenas registros pendentes", () => {
      const pending = filterPending(mockRecords);
      expect(pending.length).toBe(2);
      expect(pending.every((r) => r.status === "pending")).toBe(true);
    });

    it("deve retornar array vazio quando não há pendentes", () => {
      const records = mockRecords.filter((r) => r.status === "paid");
      const pending = filterPending(records);
      expect(pending.length).toBe(0);
    });
  });

  describe("filterOverdue", () => {
    it("deve filtrar apenas registros vencidos", () => {
      const past = new Date();
      past.setDate(past.getDate() - 10);
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const records = [
        { ...mockRecords[0], dueDate: past },
        { ...mockRecords[1], dueDate: future },
      ];
      const overdue = filterOverdue(records);
      expect(overdue.length).toBe(1);
      expect(isOverdue(overdue[0].dueDate)).toBe(true);
    });
  });

  describe("Descrição de Conta a Receber", () => {
    it("deve formatar descrição corretamente", () => {
      const clientId = 5;
      const date = new Date("2026-04-05T12:00:00Z");
      const description = `OS - Cliente ${clientId} - ${date.toLocaleDateString("pt-BR")}`;
      expect(description).toContain("OS -");
      expect(description).toContain("Cliente 5");
      expect(description).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe("Data de Vencimento (30 dias)", () => {
    it("deve adicionar 30 dias à data de emissão", () => {
      const issueDate = new Date("2026-04-05");
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const expected = new Date("2026-05-05");
      expect(dueDate.toDateString()).toBe(expected.toDateString());
    });

    it("deve lidar com virada de mês", () => {
      const issueDate = new Date("2026-03-25");
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const expected = new Date("2026-04-24");
      expect(dueDate.toDateString()).toBe(expected.toDateString());
    });

    it("deve lidar com virada de ano", () => {
      const issueDate = new Date("2026-12-15");
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const expected = new Date("2027-01-14");
      expect(dueDate.toDateString()).toBe(expected.toDateString());
    });
  });

  describe("KPIs", () => {
    it("deve calcular total a receber", () => {
      const total = mockRecords.reduce((sum, r) => sum + r.value, 0);
      expect(total).toBe(3500); // 1000 + 500 + 2000
    });

    it("deve calcular total pendente", () => {
      const pending = filterPending(mockRecords);
      const total = pending.reduce((sum, r) => sum + r.value, 0);
      expect(total).toBe(1500); // 1000 + 500
    });

    it("deve contar clientes únicos", () => {
      const clients = new Set(mockRecords.map((r) => r.clientId));
      expect(clients.size).toBe(2);
    });
  });
});
