import "./_core/load-env";

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ============ HELPERS ============

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

function createUserContext(id = 2): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `user-open-id-${id}`,
    email: `user${id}@test.com`,
    name: `User ${id}`,
    loginMethod: "manus",
    role: "user",
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

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ============ TESTS ============

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb("FinHub Inteligente - Router Tests", () => {
  describe("auth.me", () => {
    it("returns user when authenticated", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.name).toBe("Admin ML");
      expect(result?.role).toBe("admin");
    }, 15000);

    it("returns null when unauthenticated", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeNull();
    }, 15000);
  });

  describe("cadastros.employees (admin)", () => {
    it("admin can list employees", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.employees.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can create an employee", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const uniqueCpf = `T${Date.now().toString().slice(-10)}`;
      const result = await caller.cadastros.employees.create({
        name: "João Teste",
        cpf: uniqueCpf,
        status: "diarista",
      });
      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });

    it("admin can count employees", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const count = await caller.cadastros.employees.count();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("cadastros.clients (admin)", () => {
    it("admin can list clients", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.clients.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can create a client", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.clients.create({
        name: "Empresa Teste LTDA",
        cnpj: "12345678000100",
        city: "São Paulo",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("cadastros.suppliers (admin)", () => {
    it("admin can list suppliers", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.suppliers.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can create a supplier", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.suppliers.create({
        name: "Fornecedor Teste",
        cnpj: "98765432000100",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("cadastros.shifts (admin)", () => {
    it("admin can list shifts", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.shifts.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can create a shift", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.shifts.create({
        name: "Turno Manhã",
        startTime: "06:00",
        endTime: "14:00",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("cadastros.jobFunctions (admin)", () => {
    it("admin can list job functions", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.jobFunctions.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can create a job function", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.jobFunctions.create({
        name: "Operador de Empilhadeira",
        defaultPayValue: "120.00",
        defaultReceiveValue: "180.00",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("cadastros.costCenters (admin)", () => {
    it("admin can list cost centers", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.costCenters.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can create a cost center", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.costCenters.create({
        name: "Operações SP",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("cadastros.bankAccounts (admin)", () => {
    it("admin can list bank accounts", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.bankAccounts.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can create a bank account", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cadastros.bankAccounts.create({
        name: "Conta Principal",
        bankName: "Banco do Brasil",
        accountType: "checking",
        initialBalance: "10000.00",
        currentBalance: "10000.00",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("financeiro.payable (admin)", () => {
    it("admin can list accounts payable", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.financeiro.payable.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can get payable summary", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.financeiro.payable.summary();
      expect(result).toHaveProperty("totalPending");
      expect(result).toHaveProperty("totalPaid");
      expect(result).toHaveProperty("totalOverdue");
      expect(result).toHaveProperty("count");
    });

    it("admin can create an account payable", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.financeiro.payable.create({
        description: "Aluguel Escritório",
        amount: "3500.00",
        dueDate: "2026-04-15",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("financeiro.receivable (admin)", () => {
    it("admin can list accounts receivable", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.financeiro.receivable.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can get receivable summary", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.financeiro.receivable.summary();
      expect(result).toHaveProperty("totalPending");
      expect(result).toHaveProperty("totalReceived");
      expect(result).toHaveProperty("totalOverdue");
      expect(result).toHaveProperty("count");
    });

    it("admin can create an account receivable", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.financeiro.receivable.create({
        description: "Faturamento Cliente X",
        amount: "15000.00",
        dueDate: "2026-04-20",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("financeiro.dashboard (admin)", () => {
    it("admin can get dashboard KPIs", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.financeiro.dashboard.kpis();
      expect(result).toHaveProperty("revenue");
      expect(result).toHaveProperty("costs");
      expect(result).toHaveProperty("margin");
      expect(result).toHaveProperty("employeeCount");
      expect(result).toHaveProperty("clientCount");
    });
  });

  describe("financeiro.batches (admin)", () => {
    it("admin can list payment batches", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.financeiro.batches.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("usuarios (admin)", () => {
    it("admin can list users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.usuarios.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can list modules", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.usuarios.modules();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("label");
    });
  });

  describe("usuarios.myPermissions (regular user)", () => {
    it("regular user can get their own permissions", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.usuarios.myPermissions();
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });

  describe("RBAC - unauthenticated access denied", () => {
    it("unauthenticated user cannot list employees", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.cadastros.employees.list()).rejects.toThrow();
    });

    it("unauthenticated user cannot list accounts payable", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.financeiro.payable.list()).rejects.toThrow();
    });

    it("unauthenticated user cannot access dashboard KPIs", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.financeiro.dashboard.kpis()).rejects.toThrow();
    });

    it("non-admin cannot list users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.usuarios.list()).rejects.toThrow();
    });

    it("non-admin cannot set permissions", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.usuarios.setModulePermission({
          userId: 1,
          module: "employees",
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        })
      ).rejects.toThrow();
    });

    it("non-admin cannot set role", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.usuarios.setRole({ userId: 1, role: "admin" })
      ).rejects.toThrow();
    });
  });
});
