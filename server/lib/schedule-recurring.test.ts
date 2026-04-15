import { describe, expect, it } from "vitest";

import { buildRecurringDates } from "./schedule-recurring";

describe("schedule-recurring", () => {
  it("builds weekly recurring dates", () => {
    const dates = buildRecurringDates(new Date("2026-04-10T00:00:00.000Z"), "weekly", 3);

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-04-10",
      "2026-04-17",
      "2026-04-24",
    ]);
  });

  it("builds biweekly recurring dates", () => {
    const dates = buildRecurringDates(new Date("2026-04-10T00:00:00.000Z"), "biweekly", 3);

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-04-10",
      "2026-04-24",
      "2026-05-08",
    ]);
  });

  it("caps occurrences to a safe upper bound", () => {
    const dates = buildRecurringDates(new Date("2026-04-10T00:00:00.000Z"), "weekly", 100);
    expect(dates).toHaveLength(52);
  });
});
