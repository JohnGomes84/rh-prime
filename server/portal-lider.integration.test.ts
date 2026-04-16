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
  pixChangeRequests,
  scheduleOccurrences,
  scheduleAllocations,
  scheduleFunctions,
  shifts,
  users,
  workSchedules,
} from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

let leaderUserId = 0;
let adminUserId = 0;

function createLeaderContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: leaderUserId,
    openId: "leader-open-id",
    email: "joao.lider@finhub.local",
    name: "Joao Lider",
    loginMethod: "manus",
    role: "leader",
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

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: adminUserId,
    openId: "admin-open-id",
    email: "admin@finhub.local",
    name: "Admin FinHub",
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

describeIfDb("Portal Lider Integration", () => {
  beforeAll(async () => {
    await runDashboardDemoSeed();

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.openId, "leader-open-id"))
      .limit(1);

    if (!existingUser) {
      const [insertResult] = await db.insert(users).values({
        openId: "leader-open-id",
        name: "Joao Lider",
        email: "joao.lider@finhub.local",
        loginMethod: "test",
        role: "leader",
      });
      leaderUserId = Number(insertResult.insertId);
      return;
    }

    leaderUserId = existingUser.id;

    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.openId, "admin-open-id"))
      .limit(1);

    if (!existingAdmin) {
      const [insertAdmin] = await db.insert(users).values({
        openId: "admin-open-id",
        name: "Admin FinHub",
        email: "admin@finhub.local",
        loginMethod: "test",
        role: "admin",
      });
      adminUserId = Number(insertAdmin.insertId);
      return;
    }

    adminUserId = existingAdmin.id;
  }, 30000);

  async function createPortalFixture() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [leader] = await db
      .select()
      .from(employees)
      .where(eq(employees.email, "joao.lider@finhub.local"))
      .limit(1);
    const [client] = await db.select().from(clients).limit(1);
    const [shift] = await db.select().from(shifts).limit(1);
    const [jobFunction] = await db.select().from(jobFunctions).limit(1);
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.cpf, "222.222.222-22"))
      .limit(1);

    if (!leader || !client || !shift || !jobFunction || !employee) {
      throw new Error("Missing fixture dependencies");
    }

    const uniqueTag = Date.now();
    const [scheduleInsert] = await db.insert(workSchedules).values({
      date: new Date("2026-04-09T08:00:00.000Z"),
      shiftId: shift.id,
      clientId: client.id,
      leaderId: leader.id,
      status: "pendente",
      totalPayValue: "200.00",
      totalReceiveValue: "350.00",
      totalPeople: 1,
      notes: `Portal Lider fixture ${uniqueTag}`,
    });

    const scheduleId = Number(scheduleInsert.insertId);

    const [scheduleFunctionInsert] = await db.insert(scheduleFunctions).values({
      scheduleId,
      jobFunctionId: jobFunction.id,
      payValue: "200.00",
      receiveValue: "350.00",
    });

    const scheduleFunctionId = Number(scheduleFunctionInsert.insertId);

    const [allocationInsert] = await db.insert(scheduleAllocations).values({
      scheduleId,
      scheduleFunctionId,
      employeeId: employee.id,
      payValue: "200.00",
      receiveValue: "350.00",
      attendanceStatus: "presente",
    });

    return {
      scheduleId,
      allocationId: Number(allocationInsert.insertId),
      employeeCpf: employee.cpf || "",
    };
  }

  async function createTimedFixture(offsets?: {
    startMinutesOffset?: number;
    endMinutesOffset?: number;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [leader] = await db
      .select()
      .from(employees)
      .where(eq(employees.email, "joao.lider@finhub.local"))
      .limit(1);
    const [client] = await db.select().from(clients).limit(1);
    const [jobFunction] = await db.select().from(jobFunctions).limit(1);
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.cpf, "222.222.222-22"))
      .limit(1);

    if (!leader || !client || !jobFunction || !employee) {
      throw new Error("Missing timed fixture dependencies");
    }

    const now = new Date();
    const start = new Date(now.getTime() + (offsets?.startMinutesOffset ?? -30) * 60 * 1000);
    const end = new Date(now.getTime() + (offsets?.endMinutesOffset ?? 120) * 60 * 1000);

    const startTime = start.toTimeString().slice(0, 8);
    const endTime = end.toTimeString().slice(0, 8);

    const [shiftInsert] = await db.insert(shifts).values({
      name: `TST-${Date.now()}`,
      startTime,
      endTime,
      isActive: true,
    });

    const shiftId = Number(shiftInsert.insertId);

    const [scheduleInsert] = await db.insert(workSchedules).values({
      date: now,
      shiftId,
      clientId: client.id,
      leaderId: leader.id,
      status: "pendente",
      totalPayValue: "200.00",
      totalReceiveValue: "350.00",
      totalPeople: 1,
      notes: `Portal timed fixture ${Date.now()}`,
    });

    const scheduleId = Number(scheduleInsert.insertId);
    const [scheduleFunctionInsert] = await db.insert(scheduleFunctions).values({
      scheduleId,
      jobFunctionId: jobFunction.id,
      payValue: "200.00",
      receiveValue: "350.00",
    });

    const [allocationInsert] = await db.insert(scheduleAllocations).values({
      scheduleId,
      scheduleFunctionId: Number(scheduleFunctionInsert.insertId),
      employeeId: employee.id,
      payValue: "200.00",
      receiveValue: "350.00",
      attendanceStatus: "presente",
    });

    return {
      scheduleId,
      allocationId: Number(allocationInsert.insertId),
      employeeId: employee.id,
    };
  }

  it("returns leader schedules enriched with names and allocations count", async () => {
    const caller = appRouter.createCaller(createLeaderContext());
    const result = await caller.portalLider.myScheduleCards({
      dateStart: "2026-04-01T00:00:00.000Z",
      dateEnd: "2026-04-30T23:59:59.999Z",
    });

    expect(result.length).toBeGreaterThan(0);

    for (const schedule of result) {
      expect(schedule.clientName).toBeTruthy();
      expect(schedule.shiftName).toBeTruthy();
      expect("unitName" in schedule).toBe(true);
      expect(typeof schedule.allocationsCount).toBe("number");
      expect(schedule.allocationsCount).toBeGreaterThanOrEqual(0);
      expect(typeof schedule.unresolvedOccurrencesCount).toBe("number");
      expect(["none", "medium", "high"]).toContain(schedule.occurrenceSeverity);
      expect(["pendente", "validado", "cancelado"]).toContain(
        schedule.status
      );
    }
  });

  it("updates attendance including partial hours and notes", async () => {
    const fixture = await createPortalFixture();
    const caller = appRouter.createCaller(createLeaderContext());

    await caller.portalLider.setAttendance({
      allocationId: fixture.allocationId,
      scheduleId: fixture.scheduleId,
      status: "parcial",
      notes: "Saiu mais cedo",
      partialHours: 4,
    });

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [allocation] = await db
      .select()
      .from(scheduleAllocations)
      .where(eq(scheduleAllocations.id, fixture.allocationId))
      .limit(1);

    expect(allocation?.attendanceStatus).toBe("parcial");
    expect(allocation?.allocNotes).toBe("Saiu mais cedo");
    expect(Number(allocation?.payValue)).toBeGreaterThan(0);
    expect(Number(allocation?.payValue)).toBeLessThan(200);
  });

  it("registers quick expense entries and lists them for the schedule", async () => {
    const fixture = await createPortalFixture();
    const caller = appRouter.createCaller(createLeaderContext());

    await caller.portalLider.quickExpense({
      scheduleId: fixture.scheduleId,
      cpf: fixture.employeeCpf,
      type: "vale",
      value: 35,
    });

    const expenses = await caller.portalLider.listExpensesForSchedule(
      fixture.scheduleId
    );

    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses[0]?.employeeCpf).toBe(fixture.employeeCpf);
    expect(Number(expenses[0]?.voucher)).toBe(35);
    expect(Number(expenses[0]?.total)).toBeGreaterThanOrEqual(35);
  });

  it("closes the operation and marks the schedule as validated", async () => {
    const fixture = await createPortalFixture();
    const caller = appRouter.createCaller(createLeaderContext());

    await caller.portalLider.closeAttendance(fixture.scheduleId);

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [schedule] = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.id, fixture.scheduleId))
      .limit(1);
    const [allocation] = await db
      .select()
      .from(scheduleAllocations)
      .where(eq(scheduleAllocations.id, fixture.allocationId))
      .limit(1);

    expect(schedule?.status).toBe("validado");
    expect(allocation?.checkOutTime).toBeTruthy();
  }, 15000);

  it("creates a PIX change request for an allocated employee", async () => {
    const fixture = await createPortalFixture();
    const caller = appRouter.createCaller(createLeaderContext());
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [jobFunction] = await db.select().from(jobFunctions).limit(1);
    if (!jobFunction) throw new Error("Missing job function");

    const suffix = Date.now();
    const employee = await caller.portalLider.quickRegisterEmployee({
      name: `Pix Portal ${suffix}`,
      cpf: `901.000.${String(suffix).slice(-3)}-00`,
      rg: `RG-PIX-${suffix}`,
      pixKey: `pix${suffix}@old.local`,
      pixKeyType: "email",
    });

    const allocated = await caller.portalLider.allocateNewEmployee({
      scheduleId: fixture.scheduleId,
      employeeId: employee.id,
      jobFunctionId: jobFunction.id,
      payValue: 180,
      receiveValue: 320,
    });

    await caller.portalLider.requestPixChange({
      employeeId: employee.id,
      newPixKey: "nova-chave-pix-portal",
      reason: "Diarista informou nova chave",
    });

    const requests = await db.select().from(pixChangeRequests);
    const request = requests.find(r => r.employeeId === employee.id);

    expect(request).toBeTruthy();
    expect(request?.status).toBe("pendente");
    expect(request?.newPixKey).toBe("nova-chave-pix-portal");
    expect(allocated.allocationId).toBeGreaterThan(0);
  });

  it("approves a pending PIX change request and updates the employee key", async () => {
    const fixture = await createPortalFixture();
    const leaderCaller = appRouter.createCaller(createLeaderContext());
    const adminCaller = appRouter.createCaller(createAdminContext());
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [jobFunction] = await db.select().from(jobFunctions).limit(1);
    if (!jobFunction) throw new Error("Missing job function");

    const suffix = Date.now();
    const employee = await leaderCaller.portalLider.quickRegisterEmployee({
      name: `Pix Approval ${suffix}`,
      cpf: `903.000.${String(suffix).slice(-3)}-00`,
      rg: `RG-APP-${suffix}`,
      pixKey: `pix-antigo-${suffix}@old.local`,
      pixKeyType: "email",
    });

    await leaderCaller.portalLider.allocateNewEmployee({
      scheduleId: fixture.scheduleId,
      employeeId: employee.id,
      jobFunctionId: jobFunction.id,
      payValue: 180,
      receiveValue: 320,
    });

    await leaderCaller.portalLider.requestPixChange({
      employeeId: employee.id,
      newPixKey: `pix-novo-${suffix}@new.local`,
      reason: "Atualizacao de conta",
    });

    const pendingRequests = await adminCaller.portalLider.listPixRequests({
      status: "pendente",
    });
    const createdRequest = pendingRequests.find(item => item.employeeId === employee.id);

    expect(createdRequest).toBeTruthy();

    await adminCaller.portalLider.reviewPixRequest({
      requestId: createdRequest!.id,
      approved: true,
      reviewNotes: "Validado pelo financeiro",
    });

    const [updatedEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employee.id))
      .limit(1);
    const [updatedRequest] = await db
      .select()
      .from(pixChangeRequests)
      .where(eq(pixChangeRequests.id, createdRequest!.id))
      .limit(1);

    expect(updatedEmployee?.pixKey).toBe(`pix-novo-${suffix}@new.local`);
    expect(updatedRequest?.status).toBe("aprovado");
    expect(updatedRequest?.reviewedByUserId).toBe(adminUserId);
    expect(updatedRequest?.reviewNotes).toBe("Validado pelo financeiro");
  });

  it("rejects a pending PIX change request without changing the employee key", async () => {
    const fixture = await createPortalFixture();
    const leaderCaller = appRouter.createCaller(createLeaderContext());
    const adminCaller = appRouter.createCaller(createAdminContext());
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [jobFunction] = await db.select().from(jobFunctions).limit(1);
    if (!jobFunction) throw new Error("Missing job function");

    const suffix = Date.now();
    const originalPixKey = `pix-original-${suffix}@old.local`;
    const employee = await leaderCaller.portalLider.quickRegisterEmployee({
      name: `Pix Reject ${suffix}`,
      cpf: `904.000.${String(suffix).slice(-3)}-00`,
      rg: `RG-REJ-${suffix}`,
      pixKey: originalPixKey,
      pixKeyType: "email",
    });

    await leaderCaller.portalLider.allocateNewEmployee({
      scheduleId: fixture.scheduleId,
      employeeId: employee.id,
      jobFunctionId: jobFunction.id,
      payValue: 180,
      receiveValue: 320,
    });

    await leaderCaller.portalLider.requestPixChange({
      employeeId: employee.id,
      newPixKey: `pix-rejeitado-${suffix}@new.local`,
      reason: "Tentativa de troca",
    });

    const pendingRequests = await adminCaller.portalLider.listPixRequests({
      status: "pendente",
    });
    const createdRequest = pendingRequests.find(item => item.employeeId === employee.id);

    expect(createdRequest).toBeTruthy();

    await adminCaller.portalLider.reviewPixRequest({
      requestId: createdRequest!.id,
      approved: false,
      reviewNotes: "Dados bancarios divergentes",
    });

    const [updatedEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employee.id))
      .limit(1);
    const [updatedRequest] = await db
      .select()
      .from(pixChangeRequests)
      .where(eq(pixChangeRequests.id, createdRequest!.id))
      .limit(1);

    expect(updatedEmployee?.pixKey).toBe(originalPixKey);
    expect(updatedRequest?.status).toBe("rejeitado");
    expect(updatedRequest?.reviewedByUserId).toBe(adminUserId);
    expect(updatedRequest?.reviewNotes).toBe("Dados bancarios divergentes");
  });

  it("does not allow reviewing the same PIX request twice", async () => {
    const fixture = await createPortalFixture();
    const leaderCaller = appRouter.createCaller(createLeaderContext());
    const adminCaller = appRouter.createCaller(createAdminContext());
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [jobFunction] = await db.select().from(jobFunctions).limit(1);
    if (!jobFunction) throw new Error("Missing job function");

    const suffix = Date.now();
    const employee = await leaderCaller.portalLider.quickRegisterEmployee({
      name: `Pix Double ${suffix}`,
      cpf: `905.000.${String(suffix).slice(-3)}-00`,
      rg: `RG-DBL-${suffix}`,
      pixKey: `pix-double-${suffix}@old.local`,
      pixKeyType: "email",
    });

    await leaderCaller.portalLider.allocateNewEmployee({
      scheduleId: fixture.scheduleId,
      employeeId: employee.id,
      jobFunctionId: jobFunction.id,
      payValue: 180,
      receiveValue: 320,
    });

    await leaderCaller.portalLider.requestPixChange({
      employeeId: employee.id,
      newPixKey: `pix-double-${suffix}@new.local`,
      reason: "Primeira solicitacao",
    });

    const pendingRequests = await adminCaller.portalLider.listPixRequests({
      status: "pendente",
    });
    const createdRequest = pendingRequests.find(item => item.employeeId === employee.id);

    expect(createdRequest).toBeTruthy();

    await adminCaller.portalLider.reviewPixRequest({
      requestId: createdRequest!.id,
      approved: true,
      reviewNotes: "Primeira revisao",
    });

    await expect(
      adminCaller.portalLider.reviewPixRequest({
        requestId: createdRequest!.id,
        approved: false,
        reviewNotes: "Segunda revisao indevida",
      })
    ).rejects.toThrow("Solicitação já revisada");
  });

  it("quick registers and allocates a new employee to the schedule", async () => {
    const fixture = await createPortalFixture();
    const caller = appRouter.createCaller(createLeaderContext());
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [jobFunction] = await db.select().from(jobFunctions).limit(1);
    if (!jobFunction) throw new Error("Missing job function");

    const suffix = Date.now();
    const employee = await caller.portalLider.quickRegisterEmployee({
      name: `Teste Portal ${suffix}`,
      cpf: `900.000.${String(suffix).slice(-3)}-00`,
      rg: `RG-${suffix}`,
      pixKey: `teste${suffix}@pix.local`,
      pixKeyType: "email",
    });

    const allocation = await caller.portalLider.allocateNewEmployee({
      scheduleId: fixture.scheduleId,
      employeeId: employee.id,
      jobFunctionId: jobFunction.id,
      payValue: 180,
      receiveValue: 320,
    });

    const [savedAllocation] = await db
      .select()
      .from(scheduleAllocations)
      .where(eq(scheduleAllocations.id, allocation.allocationId))
      .limit(1);

    expect(savedAllocation?.employeeId).toBe(employee.id);
    expect(savedAllocation?.scheduleId).toBe(fixture.scheduleId);
  });

  it("removes an allocated employee while the operation is still pending", async () => {
    const fixture = await createPortalFixture();
    const caller = appRouter.createCaller(createLeaderContext());
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [jobFunction] = await db.select().from(jobFunctions).limit(1);
    if (!jobFunction) throw new Error("Missing job function");

    const suffix = Date.now();
    const employee = await caller.portalLider.quickRegisterEmployee({
      name: `Remocao Portal ${suffix}`,
      cpf: `902.000.${String(suffix).slice(-3)}-00`,
      rg: `RG-REM-${suffix}`,
      pixKey: `remove${suffix}@pix.local`,
      pixKeyType: "email",
    });

    const allocation = await caller.portalLider.allocateNewEmployee({
      scheduleId: fixture.scheduleId,
      employeeId: employee.id,
      jobFunctionId: jobFunction.id,
      payValue: 180,
      receiveValue: 320,
    });

    await caller.portalLider.removeAllocation({
      scheduleId: fixture.scheduleId,
      allocationId: allocation.allocationId,
    });

    const [savedAllocation] = await db
      .select()
      .from(scheduleAllocations)
      .where(eq(scheduleAllocations.id, allocation.allocationId))
      .limit(1);

    expect(savedAllocation).toBeUndefined();
  });

  it("creates automatic occurrences for late check-in, absence and early exit", async () => {
    const fixture = await createTimedFixture({
      startMinutesOffset: -45,
      endMinutesOffset: 180,
    });
    const caller = appRouter.createCaller(createLeaderContext());

    await caller.portalLider.checkIn({
      allocationId: fixture.allocationId,
      scheduleId: fixture.scheduleId,
    });

    await caller.portalLider.setAttendance({
      allocationId: fixture.allocationId,
      scheduleId: fixture.scheduleId,
      status: "faltou",
      notes: "Não compareceu",
    });

    await caller.portalLider.checkOut({
      allocationId: fixture.allocationId,
      scheduleId: fixture.scheduleId,
    });

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const created = await db
      .select()
      .from(scheduleOccurrences)
      .where(eq(scheduleOccurrences.scheduleId, fixture.scheduleId));

    const types = created.map(item => item.type);
    expect(types).toContain("late");
    expect(types).toContain("absence");
    expect(types).toContain("early_exit");
  });

  it("resolves occurrences and reflects unresolved count on schedule cards", async () => {
    const fixture = await createPortalFixture();
    const leaderCaller = appRouter.createCaller(createLeaderContext());
    const adminCaller = appRouter.createCaller(createAdminContext());

    const created = await leaderCaller.portalLider.addOccurrence({
      scheduleId: fixture.scheduleId,
      employeeId: undefined,
      type: "critical",
      description: "Falha operacional crítica",
    });

    const scheduleDate = new Date("2026-04-09T08:00:00.000Z");
    const cards = await leaderCaller.portalLider.myScheduleCards({
      dateStart: new Date(
        scheduleDate.getFullYear(),
        scheduleDate.getMonth(),
        1
      ).toISOString(),
      dateEnd: new Date(
        scheduleDate.getFullYear(),
        scheduleDate.getMonth() + 1,
        0,
        23,
        59,
        59
      ).toISOString(),
    });
    const targetCard = cards.find(item => item.id === fixture.scheduleId);

    expect(targetCard?.unresolvedOccurrencesCount).toBeGreaterThanOrEqual(1);
    expect(targetCard?.occurrenceSeverity).toBe("high");

    await adminCaller.admin.resolveOccurrence(created.id);

    const occurrences = await leaderCaller.portalLider.listOccurrences(fixture.scheduleId);
    const resolved = occurrences.find(item => item.id === created.id);

    expect(resolved?.resolved).toBe(true);
  });
});
