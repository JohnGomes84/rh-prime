import "./_core/load-env";

import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { runDashboardDemoSeed } from "./lib/seed-dashboard-demo";
import { getDb } from "./db";
import {
  clients,
  employees,
  jobFunctions,
  shifts,
  users,
  workSchedules,
  scheduleAllocations,
  scheduleFunctions,
  paymentBatches,
  paymentBatchItems,
  accountsPayable,
  accountsReceivable,
} from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
let adminUserId = 0;
let cpfCounter = 0;

function nextCpf() {
  cpfCounter += 1;
  return `${Date.now()}${cpfCounter}`.slice(-11).padStart(11, "0");
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: adminUserId,
    openId: "flows-admin-open-id",
    email: "admin@flows.local",
    name: "Admin Flows",
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

describeIfDb("Flow 1 — Cadastro → Planejamento → Alocação → Validação", () => {
  beforeAll(async () => {
    await runDashboardDemoSeed();
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [admin] = await db
      .insert(users)
      .values({
        openId: "flows-admin",
        email: "admin@flows.local",
        name: "Admin Flows",
        role: "admin",
      })
      .onDuplicateKeyUpdate({ set: { name: "Admin Flows" } });
    adminUserId = Number(admin.insertId) || (
      await db.select().from(users).where(eq(users.openId, "flows-admin")).limit(1)
    )[0]?.id || 0;
  });

  it("cria cliente, funcionário, planejamento e aloca diarista", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 1. Cadastro: cliente
    const client = await caller.cadastros.clients.create({
      name: `Cliente Flow ${Date.now()}`,
      cnpj: "12345678000190",
    });
    expect(client.id).toBeGreaterThan(0);

    // 2. Cadastro: funcionário (CPF 11 dígitos numéricos)
    const employee = await caller.cadastros.employees.create({
      name: "Diarista Flow",
      cpf: nextCpf(),
      pixKey: "diarista@flow.local",
      pixKeyType: "email",
      status: "diarista",
    });
    expect(employee.id).toBeGreaterThan(0);

    // 3. Função do cargo
    const jobFunc = await caller.cadastros.jobFunctions.create({
      name: `Aux. Flow ${Date.now()}`,
      defaultPayValue: "100",
      defaultReceiveValue: "150",
    });
    expect(jobFunc.id).toBeGreaterThan(0);

    // 4. Turno
    const shift = await caller.cadastros.shifts.create({
      name: `MLT-FLOW-${Date.now()}`,
      startTime: "06:00",
      endTime: "15:00",
    });
    expect(shift.id).toBeGreaterThan(0);

    // 5. Planejamento
    const dateStr = new Date(Date.UTC(2050, 0, 1 + (cpfCounter % 1000))).toISOString().slice(0, 10);
    const sched = await caller.planejamentos.create({
      date: dateStr,
      clientId: client.id,
      shiftId: shift.id,
    });
    expect(sched.id).toBeGreaterThan(0);

    // 6. Adicionar função ao planejamento
    const schedFunc = await caller.planejamentos.functions.add({
      scheduleId: sched.id,
      jobFunctionId: jobFunc.id,
      payValue: "120",
      receiveValue: "180",
    });
    expect(schedFunc.id).toBeGreaterThan(0);

    // 7. Alocar diarista
    const alloc = await caller.planejamentos.allocations.addBatch({
      scheduleFunctionId: schedFunc.id,
      scheduleId: sched.id,
      employeeIds: [employee.id],
    });
    expect(alloc.added).toBe(1);

    // 8. Validar planejamento
    const validated = await caller.planejamentos.validate(sched.id);
    expect(validated.success).toBe(true);

    const [final] = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.id, sched.id))
      .limit(1);
    expect(final.status).toBe("validado");
  });

  it("bloqueia mudança de status inválida", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    // Cria cliente único para evitar colisão com planejamentos seedados
    const client = await caller.cadastros.clients.create({
      name: `Cliente Status ${Date.now()}`,
    });
    const dateStr = new Date(Date.UTC(2055, 0, 1 + (cpfCounter % 1000))).toISOString().slice(0, 10);
    const sched = await caller.planejamentos.create({
      date: dateStr,
      clientId: client.id,
    });
    // pendente → cancelado OK
    await caller.planejamentos.update({ id: sched.id, status: "cancelado" });
    // cancelado → validado deve falhar
    await expect(
      caller.planejamentos.update({ id: sched.id, status: "validado" })
    ).rejects.toThrow();
  });
});

describeIfDb("Flow 2 — Folha + AP/AR", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!adminUserId) {
      const [admin] = await db
        .insert(users)
        .values({
          openId: "flows-admin",
          email: "admin@flows.local",
          name: "Admin Flows",
          role: "admin",
        })
        .onDuplicateKeyUpdate({ set: { name: "Admin Flows" } });
      adminUserId = Number(admin.insertId) || (
        await db.select().from(users).where(eq(users.openId, "flows-admin")).limit(1)
      )[0]?.id || 0;
    }
  });

  it("cria conta a pagar e marca como paga (state machine)", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const created = await caller.financeiro.payable.create({
      description: `Despesa Flow ${Date.now()}`,
      amount: "500.00",
      dueDate: "2050-06-15",
    });
    expect(created.id).toBeGreaterThan(0);

    const paid = await caller.financeiro.payable.markPaid({
      id: created.id,
      paymentDate: "2050-06-10",
    });
    expect(paid.success).toBe(true);

    // Conta paga: amount/dueDate bloqueados (assertPayableTransition + lock pós-pagamento)
    await expect(
      caller.financeiro.payable.update({ id: created.id, amount: "999.99" })
    ).rejects.toThrow();
    // pago → pendente é transição inválida
    await expect(
      caller.financeiro.payable.update({ id: created.id, status: "pendente" })
    ).rejects.toThrow();
  });

  it("cria conta a receber e marca como recebida", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const created = await caller.financeiro.receivable.create({
      description: `Receita Flow ${Date.now()}`,
      amount: "1000.00",
      dueDate: "2050-07-01",
    });
    const received = await caller.financeiro.receivable.markReceived({
      id: created.id,
    });
    expect(received.success).toBe(true);
  });

  it("cria lote de pagamento e impede pagar lote vazio", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const batch = await caller.financeiro.batches.create({
      title: `Lote Flow ${Date.now()}`,
      periodStart: "2050-08-01",
      periodEnd: "2050-08-31",
    });
    expect(batch.id).toBeGreaterThan(0);

    // Lote vazio não pode ser pago (assertBatchCanBePaid)
    await expect(caller.financeiro.batches.markPaid(batch.id)).rejects.toThrow();
  });

  it("rejeita amount vazio na criação (validador moneyString)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.financeiro.payable.create({
        description: "Teste validação",
        amount: "",
        dueDate: "2050-09-01",
      } as any)
    ).rejects.toThrow();
  });

  it("rejeita CPF inválido na criação de funcionário (validador cpfOptional)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.cadastros.employees.create({
        name: "Teste CPF",
        cpf: "123",
      })
    ).rejects.toThrow();
  });
});
