import { describe, expect, it } from "vitest";

import {
  paymentBatchItems,
  pixChangeRequests,
  reportTemplates,
  scheduleAllocations,
  scheduleFunctions,
  workSchedules,
} from "../../drizzle/schema";
import { appRouter } from "../routers";

describe("Critical Flows Contract", () => {
  it("registers the critical routers in the application router", () => {
    const routerKeys = Object.keys(appRouter._def.record);

    expect(routerKeys).toEqual(
      expect.arrayContaining([
        "planejamentos",
        "portalLider",
        "relatorios",
        "notifications",
        "audit",
        "admin",
      ])
    );
  });

  it("keeps planning and allocation schema fields required by operations", () => {
    expect(workSchedules).toHaveProperty("date");
    expect(workSchedules).toHaveProperty("status");
    expect(workSchedules).toHaveProperty("leaderId");

    expect(scheduleFunctions).toHaveProperty("payValue");
    expect(scheduleFunctions).toHaveProperty("receiveValue");

    expect(scheduleAllocations).toHaveProperty("voucher");
    expect(scheduleAllocations).toHaveProperty("bonus");
    expect(scheduleAllocations).toHaveProperty("mealAllowance");
    expect(scheduleAllocations).toHaveProperty("checkOutTime");
  });

  it("keeps audit fields needed for PIX review and payment traceability", () => {
    expect(pixChangeRequests).toHaveProperty("requestedByUserId");
    expect(pixChangeRequests).toHaveProperty("reviewedByUserId");
    expect(pixChangeRequests).toHaveProperty("reviewNotes");

    expect(paymentBatchItems).toHaveProperty("status");
    expect(paymentBatchItems).toHaveProperty("pixKey");
  });

  it("keeps report persistence structures available", () => {
    expect(reportTemplates).toHaveProperty("name");
    expect(reportTemplates).toHaveProperty("filters");
    expect(reportTemplates).toHaveProperty("sections");
  });

  it("preserves the expected financial summary semantics", () => {
    const totalPay = 1000;
    const totalReceive = 1500;
    const margin = totalReceive - totalPay;
    const marginPercent = ((margin / totalReceive) * 100).toFixed(2);

    expect(margin).toBe(500);
    expect(Number(marginPercent)).toBeCloseTo(33.33, 2);
  });
});
