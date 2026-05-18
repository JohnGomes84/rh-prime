import { describe, expect, it } from "vitest";
import {
  assertBatchCanBePaid,
  assertScheduleEditable,
  calculatePaymentBatchItemTotal,
  filterNewEmployeesWithoutDuplicate,
} from "./_core/criticalFlows";

describe("critical flows - fase 2", () => {
  it("calcula total do item de lote corretamente (marmita e vale descontam, bônus soma)", () => {
    // 5 × 100 − 20 (marmita) − 10 (vale) + 30 (bônus) = 500
    const total = calculatePaymentBatchItemTotal({
      daysWorked: 5,
      dailyRate: "100",
      mealAllowance: "20",
      bonus: "30",
      voucher: "10",
    });
    expect(total).toBe("500.00");
  });

  it("remove duplicados já existentes na alocação", () => {
    const result = filterNewEmployeesWithoutDuplicate([1, 2, 3, 4], [2, 4]);
    expect(result).toEqual([1, 3]);
  });

  it("bloqueia edição quando planejamento não está pendente", () => {
    expect(() => assertScheduleEditable("validado")).toThrow(/pendente/);
    expect(() => assertScheduleEditable("cancelado")).toThrow(/pendente/);
  });

  it("permite pagamento de lote pendente com itens válidos", () => {
    expect(() =>
      assertBatchCanBePaid({
        status: "pendente",
        itemsCount: 2,
        hasPaidItem: false,
      })
    ).not.toThrow();
  });

  it("bloqueia pagamento de lote inconsistente", () => {
    expect(() =>
      assertBatchCanBePaid({
        status: "pago",
        itemsCount: 2,
        hasPaidItem: false,
      })
    ).toThrow(/pendente/);
    expect(() =>
      assertBatchCanBePaid({
        status: "pendente",
        itemsCount: 0,
        hasPaidItem: false,
      })
    ).toThrow(/sem itens/);
  });
});
