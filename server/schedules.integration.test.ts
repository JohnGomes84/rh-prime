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

describeIfDb("Schedules Integration", () => {
  beforeAll(async () => {
    await runDashboardDemoSeed();
  });

  it("creates recurring schedules and skips duplicates on rerun", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const uniqueOffsetDays = Math.floor(Date.now() / 1000) % 5000;
    const uniqueBaseDate = new Date(Date.UTC(2040, 0, 1 + uniqueOffsetDays))
      .toISOString()
      .slice(0, 10);

    const firstRun = await caller.planejamentos.createRecurring({
      date: uniqueBaseDate,
      clientId: 1,
      shiftId: 1,
      recurrence: {
        frequency: "weekly",
        occurrences: 3,
      },
    });

    expect(firstRun.created).toBe(3);
    expect(firstRun.skipped).toBe(0);

    const secondRun = await caller.planejamentos.createRecurring({
      date: uniqueBaseDate,
      clientId: 1,
      shiftId: 1,
      recurrence: {
        frequency: "weekly",
        occurrences: 3,
      },
    });

    expect(secondRun.created).toBe(0);
    expect(secondRun.skipped).toBe(3);
  });

  it("imports schedules from csv and returns row-level errors", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const baseOffsetDays = Math.floor(Date.now() / 1000) % 5000;
    const validDate = new Date(Date.UTC(2040, 1, 1 + baseOffsetDays))
      .toISOString()
      .slice(0, 10);
    const invalidDate = new Date(Date.UTC(2040, 1, 22 + baseOffsetDays))
      .toISOString()
      .slice(0, 10);

    const result = await caller.planejamentos.importCsv({
      csvContent: [
        "data,cliente,turno,unidade,lider,observacoes",
        `${validDate},Logistica Aurora,MLT-1,,Joao Lider,Operacao importada`,
        `${invalidDate},Cliente Inexistente,MLT-1,,Joao Lider,Deve falhar`,
      ].join("\n"),
    });

    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/cliente/i);
  });
});
