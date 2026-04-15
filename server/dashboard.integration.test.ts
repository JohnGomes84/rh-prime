import "./_core/load-env";

import { beforeAll, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { runDashboardDemoSeed } from "./lib/seed-dashboard-demo";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-open-id",
    email: "admin@mlservicoseco.com.br",
    name: "Admin ML",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb("Dashboard Integration", () => {
  beforeAll(async () => {
    await runDashboardDemoSeed();
  }, 30000);

  it("returns monthly KPIs with numeric values", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboard.getMonthlyKPIs({ year: 2026, month: 4 });

    expect(typeof result.revenue.current).toBe("number");
    expect(typeof result.costs.current).toBe("number");
    expect(typeof result.margin.current).toBe("number");
    expect(typeof result.works.current).toBe("number");
    expect(result.revenue.current).toBeGreaterThan(0);
    expect(result.costs.current).toBeGreaterThan(0);
    expect(result.works.current).toBeGreaterThan(0);
  });

  it("returns actionable alerts for the demo dataset", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboard.getAlerts({ year: 2026, month: 4 });

    expect(result.overdueAccounts.count).toBeGreaterThan(0);
    expect(result.employeesWithoutPix.count).toBeGreaterThan(0);
    expect(result.pendingSchedules.count).toBeGreaterThan(0);
    expect(typeof result.overdueAccounts.total).toBe("number");
  });

  it("returns daily financial evolution including costs and margin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboard.getDailyFinancialEvolution({ year: 2026, month: 4 });

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((item) => item.revenue > 0)).toBe(true);
    expect(result.some((item) => item.costs > 0)).toBe(true);
    expect(result.some((item) => item.margin !== 0)).toBe(true);
  });

  it("returns top clients for the month with numeric totals", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboard.getTopClients({ year: 2026, month: 4 });

    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]?.totalRevenue).toBe("number");
    expect(typeof result[0]?.workCount).toBe("number");
    expect(result[0]?.clientName).toBeTruthy();
  });

  it("returns numeric account summary values", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboard.getAccountsSummary({ year: 2026, month: 4 });

    expect(typeof result.payablePending).toBe("number");
    expect(typeof result.receivablePending).toBe("number");
    expect(typeof result.forecastedBalance).toBe("number");
    expect(result.forecastedBalance).toBeGreaterThan(0);
  });

  it("returns a valid numeric health score", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboardEnhancements.getHealthScore({ year: 2026, month: 4 });

    expect(typeof result.score).toBe("number");
    expect(Number.isNaN(result.score)).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(typeof result.breakdown.margin.score).toBe("number");
  });

  it("returns quarterly comparison and forecast with numeric aggregates", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const comparison = await caller.dashboardEnhancements.getTrimestrialComparison({ year: 2026 });
    const forecast = await caller.dashboardAdvanced.getCashFlowForecast({ year: 2026, month: 4 });

    expect(comparison.quarters).toHaveLength(4);
    expect(typeof comparison.ytd.revenue).toBe("number");
    expect(typeof comparison.ytd.marginPercent).toBe("number");
    expect(forecast.historical.length).toBeGreaterThan(0);
    expect(typeof forecast.summary.avgRevenue).toBe("number");
    expect(typeof forecast.summary.avgCosts).toBe("number");
  });

  it("returns dashboard drill-down data with numeric totals", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const revenueDetails = await caller.dashboardAdvanced.getRevenueDetails({ year: 2026, month: 4 });
    const costDetails = await caller.dashboardAdvanced.getCostsDetails({ year: 2026, month: 4 });

    expect(revenueDetails.byStatus.length).toBeGreaterThan(0);
    expect(revenueDetails.byClient.length).toBeGreaterThan(0);
    expect(typeof revenueDetails.byStatus[0]?.total).toBe("number");
    expect(typeof revenueDetails.byClient[0]?.count).toBe("number");
    expect(costDetails.byStatus.length).toBeGreaterThan(0);
    expect(typeof costDetails.byStatus[0]?.total).toBe("number");
  });
});
