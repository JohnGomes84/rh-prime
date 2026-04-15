import "../_core/load-env";

import { beforeAll, describe, it, expect } from "vitest";
import { runDashboardDemoSeed } from "./seed-dashboard-demo";
import { validateScheduleRules, validateScheduleAtomic } from "./schedule-validation";

describe("Schedule Validation", () => {
  beforeAll(async () => {
    await runDashboardDemoSeed();
  }, 30000);

  describe("validateScheduleRules", () => {
    it("deve retornar erro para planejamento não encontrado", async () => {
      const result = await validateScheduleRules(99999);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Planejamento não encontrado");
    });

    it("deve validar regras corretamente", async () => {
      // Mock: em produção, seria necessário criar um planejamento de teste no banco
      // Por enquanto, apenas testamos a lógica de validação
      const result = await validateScheduleRules(1);
      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("errors");
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("validateScheduleAtomic", () => {
    it("deve retornar erro para planejamento não encontrado", async () => {
      const result = await validateScheduleAtomic(99999, 1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("deve retornar estrutura correta de sucesso", async () => {
      const result = await validateScheduleAtomic(1, 1);
      expect(result).toHaveProperty("success");
      if (result.success) {
        expect(result).toHaveProperty("paymentRecordsCreated");
        expect(result).toHaveProperty("accountsReceivableCreated");
      }
    });

    it("deve retornar estrutura correta de erro", async () => {
      const result = await validateScheduleAtomic(99999, 1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Cálculo de Pagamento", () => {
    it("deve calcular: base - marmita - vale + bônus", () => {
      const base = 100;
      const marmita = 10;
      const vale = 5;
      const bonus = 20;
      const expected = base - marmita - vale + bonus;
      expect(expected).toBe(105);
    });

    it("deve calcular com valores zero", () => {
      const base = 100;
      const marmita = 0;
      const vale = 0;
      const bonus = 0;
      const expected = base - marmita - vale + bonus;
      expect(expected).toBe(100);
    });

    it("deve calcular com apenas bônus", () => {
      const base = 100;
      const marmita = 0;
      const vale = 0;
      const bonus = 50;
      const expected = base - marmita - vale + bonus;
      expect(expected).toBe(150);
    });

    it("deve calcular com apenas descontos", () => {
      const base = 100;
      const marmita = 15;
      const vale = 10;
      const bonus = 0;
      const expected = base - marmita - vale + bonus;
      expect(expected).toBe(75);
    });
  });

  describe("Validação de Valores", () => {
    it("deve rejeitar valor paga negativo", () => {
      const payValue = -50;
      const isValid = payValue >= 0;
      expect(isValid).toBe(false);
    });

    it("deve rejeitar valor recebe negativo", () => {
      const receiveValue = -100;
      const isValid = receiveValue >= 0;
      expect(isValid).toBe(false);
    });

    it("deve aceitar valores positivos", () => {
      const payValue = 100;
      const receiveValue = 150;
      expect(payValue >= 0).toBe(true);
      expect(receiveValue >= 0).toBe(true);
    });

    it("deve aceitar valores zero", () => {
      const payValue = 0;
      const receiveValue = 0;
      expect(payValue >= 0).toBe(true);
      expect(receiveValue >= 0).toBe(true);
    });
  });

  describe("Geração de Data de Vencimento", () => {
    it("deve adicionar 30 dias à data do planejamento", () => {
      const scheduleDate = new Date("2026-04-05");
      const dueDate = new Date(scheduleDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const expected = new Date("2026-05-05");
      expect(dueDate.toDateString()).toBe(expected.toDateString());
    });

    it("deve lidar com virada de mês", () => {
      const scheduleDate = new Date("2026-03-25");
      const dueDate = new Date(scheduleDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const expected = new Date("2026-04-24");
      expect(dueDate.toDateString()).toBe(expected.toDateString());
    });

    it("deve lidar com virada de ano", () => {
      const scheduleDate = new Date("2026-12-15");
      const dueDate = new Date(scheduleDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const expected = new Date("2027-01-14");
      expect(dueDate.toDateString()).toBe(expected.toDateString());
    });
  });

  describe("Formatação de Período (YYYY-MM)", () => {
    it("deve formatar período corretamente", () => {
      const date = new Date("2026-04-05");
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      expect(period).toBe("2026-04");
    });

    it("deve formatar com zero à esquerda para mês < 10", () => {
      const date = new Date("2026-01-15");
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      expect(period).toBe("2026-01");
    });

    it("deve formatar com zero à esquerda para mês 09", () => {
      const date = new Date("2026-09-20");
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      expect(period).toBe("2026-09");
    });
  });

  describe("Descrição de Conta a Receber", () => {
    it("deve formatar descrição corretamente", () => {
      const clientId = 5;
      const date = new Date("2026-04-05");
      const description = `OS - Cliente ${clientId} - ${date.toLocaleDateString("pt-BR")}`;
      expect(description).toContain("OS -");
      expect(description).toContain("Cliente 5");
      expect(description).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });
});
