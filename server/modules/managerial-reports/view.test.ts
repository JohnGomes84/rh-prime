import { describe, it, expect } from "vitest";
import { isOverdue, itemRollup } from "./view.js";

describe("isOverdue", () => {
  const now = new Date("2026-06-26T12:00:00Z");

  it("é true quando passou do prazo e não está validado", () => {
    expect(isOverdue({ dueDate: "2026-06-20", status: "rascunho" }, now)).toBe(true);
    expect(isOverdue({ dueDate: "2026-06-20", status: "enviado" }, now)).toBe(true);
  });

  it("é false quando validado, mesmo passado o prazo", () => {
    expect(isOverdue({ dueDate: "2026-06-20", status: "validado" }, now)).toBe(false);
  });

  it("é false quando ainda dentro do prazo", () => {
    expect(isOverdue({ dueDate: "2026-06-30", status: "rascunho" }, now)).toBe(false);
  });
});

describe("itemRollup", () => {
  it("conta itens por status", () => {
    const r = itemRollup([
      { itemStatus: "pendente" },
      { itemStatus: "pendente" },
      { itemStatus: "em_andamento" },
      { itemStatus: "concluido" },
    ]);
    expect(r).toEqual({ pendente: 2, em_andamento: 1, concluido: 1, total: 4 });
  });

  it("lida com lista vazia", () => {
    expect(itemRollup([])).toEqual({ pendente: 0, em_andamento: 0, concluido: 0, total: 0 });
  });
});
