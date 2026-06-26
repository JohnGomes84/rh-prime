import { describe, it, expect } from "vitest";
import { fridayOfIsoWeek, isoWeekRef, firstDayOfNextMonth, monthRef } from "./period.js";

describe("period helpers", () => {
  it("fridayOfIsoWeek retorna sempre uma sexta (UTC)", () => {
    expect(fridayOfIsoWeek("2026-W26").getUTCDay()).toBe(5);
    expect(fridayOfIsoWeek("2026-W01").getUTCDay()).toBe(5);
    expect(fridayOfIsoWeek("2025-W52").getUTCDay()).toBe(5);
  });

  it("isoWeekRef ∘ fridayOfIsoWeek é identidade", () => {
    for (const ref of ["2026-W01", "2026-W26", "2026-W52", "2025-W10"]) {
      expect(isoWeekRef(fridayOfIsoWeek(ref))).toBe(ref);
    }
  });

  it("firstDayOfNextMonth avança o mês (e o ano em dezembro)", () => {
    const jun = firstDayOfNextMonth("2026-06");
    expect(jun.getUTCFullYear()).toBe(2026);
    expect(jun.getUTCMonth()).toBe(6); // julho (0-indexed)
    expect(jun.getUTCDate()).toBe(1);

    const dec = firstDayOfNextMonth("2026-12");
    expect(dec.getUTCFullYear()).toBe(2027);
    expect(dec.getUTCMonth()).toBe(0); // janeiro
  });

  it("monthRef formata YYYY-MM", () => {
    expect(monthRef(new Date(Date.UTC(2026, 6, 1)))).toBe("2026-07");
    expect(monthRef(new Date(Date.UTC(2027, 0, 15)))).toBe("2027-01");
  });
});
