import { describe, expect, it } from "vitest";
import { candidateForDate, daysUntil, reminderKey } from "./recurrence.js";

describe("operational routine recurrence", () => {
  it("gera periodo mensal com dia do mes e antecedencia", () => {
    const result = candidateForDate(
      { frequency: "monthly", dayOfMonth: 10, generateLeadDays: 7 },
      new Date("2026-06-03T12:00:00Z"),
    );
    expect(result).toEqual({ periodRef: "2026-06", dueDate: "2026-06-10" });
  });

  it("avanca para o proximo mes quando o prazo do mes ja passou", () => {
    const result = candidateForDate(
      { frequency: "monthly", dayOfMonth: 5, generateLeadDays: 7 },
      new Date("2026-06-20T12:00:00Z"),
    );
    expect(result).toEqual({ periodRef: "2026-07", dueDate: "2026-07-05" });
  });

  it("gera rotina semanal dentro da janela de antecedencia", () => {
    const result = candidateForDate(
      { frequency: "weekly", dayOfWeek: 5, generateLeadDays: 3 },
      new Date("2026-06-24T12:00:00Z"),
    );
    expect(result).toEqual({ periodRef: "2026-W26", dueDate: "2026-06-26" });
  });

  it("calcula chaves de lembrete estaveis", () => {
    expect(daysUntil("2026-06-30", new Date("2026-06-27T12:00:00Z"))).toBe(3);
    expect(reminderKey(3, "2026-06-30")).toBe("d-3:2026-06-30");
    expect(reminderKey(-1, "2026-06-20")).toBe("overdue:2026-06-20");
  });
});
