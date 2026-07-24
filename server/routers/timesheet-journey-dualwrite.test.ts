/**
 * F1 - Dual-write legado -> Journey V2 (paridade e seguranca).
 *
 * O dual-write JA EXISTE em server/routers/timesheet.ts
 * (`mirrorLegacyPunchToJourneyV2`), atras das flags `journey-v2-api` +
 * `journey-v2-dual-run`. Esta fase valida o comportamento; o mirror nao foi
 * reescrito, apenas corrigido em um furo de borda (ver ultimo bloco).
 *
 * Apos o fix da F1, o mirror espelha pelo EMPLOYEE RESOLVIDO da batida legada
 * via `registerJourneyPunchEventForEmployeeId(employeeId, input)` -- nao mais
 * pelo `ctx.user`. Isso evita divergencia quando a batida e por-conta-de-outro.
 *
 * Cobre:
 *  - paridade (flags ON): clockIn -> clock_in, clockOut -> clock_out, mesmo
 *    timestamp da batida legada, source `legacy_shadow`, sourceReference do
 *    time_record, e employeeId resolvido;
 *  - gating: precisa das DUAS flags (api + dual-run);
 *  - seguranca: V2 falhando nao quebra o ponto legado (mirror engole o erro);
 *  - correcao cross-employee: batida por-conta-de-outro espelha para o
 *    employee alvo, nao para o caller.
 *
 * Estrategia: mocka `registerJourneyPunchEventForEmployeeId` (spy) para capturar
 * os argumentos do mirror sem tocar o banco. Flags via process.env (lidas por
 * isFeatureEnabled em tempo de chamada) e limpas a cada teste.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../modules/journey-v2/service.js", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    registerJourneyPunchEventForUser: vi.fn(async () => ({ id: 9001, eventType: "mock" })),
    registerJourneyPunchEventForEmployeeId: vi.fn(async () => ({ id: 9002, eventType: "mock" })),
  };
});

import { appRouter } from "../routers.js";
import { registerJourneyPunchEventForEmployeeId } from "../modules/journey-v2/service.js";

const mirror = vi.mocked(registerJourneyPunchEventForEmployeeId);

const SELF_ID = 777;

function selfCaller(role = "colaborador") {
  const ctx = {
    user: { id: SELF_ID, email: "self@example.com", role },
    req: { headers: {} },
    res: { setHeader: () => {}, clearCookie: () => {} },
  };
  return appRouter.createCaller(ctx as any);
}

function enableBothFlags() {
  process.env.JOURNEY_V2_API_ENABLED = "true";
  process.env.JOURNEY_V2_DUAL_RUN_ENABLED = "true";
}
function clearFlags() {
  delete process.env.JOURNEY_V2_API_ENABLED;
  delete process.env.JOURNEY_V2_DUAL_RUN_ENABLED;
}

beforeEach(() => {
  mirror.mockClear();
  mirror.mockResolvedValue({ id: 9002, eventType: "mock" } as any);
  clearFlags();
});
afterEach(() => {
  clearFlags();
});

describe("F1 - dual-write paridade (flags ON)", () => {
  it("clockIn espelha clock_in para o employee resolvido, mesmo timestamp, source legacy_shadow", async () => {
    enableBothFlags();
    const caller = selfCaller();

    const before = Date.now();
    const result = await caller.timesheet.clockIn({ employeeId: SELF_ID });
    const after = Date.now();

    expect(mirror).toHaveBeenCalledTimes(1);
    const [employeeId, payload] = mirror.mock.calls[0] as [number, any];
    expect(employeeId).toBe(SELF_ID);
    expect(payload.eventType).toBe("clock_in");
    expect(payload.source).toBe("legacy_shadow");
    expect(payload.sourceReference).toBe(`time_record:${result.id}:clock_in`);

    // Paridade de timestamp: occurredAt == o clockIn gravado no legado.
    const mirroredAt = new Date(payload.occurredAt).getTime();
    expect(mirroredAt).toBeGreaterThanOrEqual(before);
    expect(mirroredAt).toBeLessThanOrEqual(after);
  });

  it("clockOut espelha clock_out para o employee resolvido, com o timestamp da saida", async () => {
    enableBothFlags();
    const caller = selfCaller();
    await caller.timesheet.clockIn({ employeeId: SELF_ID });
    mirror.mockClear();

    const before = Date.now();
    await caller.timesheet.clockOut({ employeeId: SELF_ID });
    const after = Date.now();

    expect(mirror).toHaveBeenCalledTimes(1);
    const [employeeId, payload] = mirror.mock.calls[0] as [number, any];
    expect(employeeId).toBe(SELF_ID);
    expect(payload.eventType).toBe("clock_out");
    expect(payload.source).toBe("legacy_shadow");
    const mirroredAt = new Date(payload.occurredAt).getTime();
    expect(mirroredAt).toBeGreaterThanOrEqual(before);
    expect(mirroredAt).toBeLessThanOrEqual(after);
  });
});

describe("F1 - dual-write gating (precisa das duas flags)", () => {
  it("sem flags: nao espelha", async () => {
    const caller = selfCaller();
    await caller.timesheet.clockIn({ employeeId: SELF_ID });
    expect(mirror).not.toHaveBeenCalled();
  });

  it("so journey-v2-api ON (sem dual-run): nao espelha", async () => {
    process.env.JOURNEY_V2_API_ENABLED = "true";
    const caller = selfCaller();
    await caller.timesheet.clockIn({ employeeId: SELF_ID });
    expect(mirror).not.toHaveBeenCalled();
  });

  it("so dual-run ON (sem api): nao espelha", async () => {
    process.env.JOURNEY_V2_DUAL_RUN_ENABLED = "true";
    const caller = selfCaller();
    await caller.timesheet.clockIn({ employeeId: SELF_ID });
    expect(mirror).not.toHaveBeenCalled();
  });
});

describe("F1 - dual-write seguranca (V2 falhar nao quebra o legado)", () => {
  it("mirror rejeitando: clockIn legado permanece integro", async () => {
    enableBothFlags();
    mirror.mockRejectedValueOnce(new Error("V2 down"));
    const caller = selfCaller();

    const result = await caller.timesheet.clockIn({ employeeId: SELF_ID });
    expect(result.success).toBe(true);
    expect(typeof result.id).toBe("number");
    expect(mirror).toHaveBeenCalledTimes(1);
  });

  it("mirror rejeitando: clockOut legado permanece integro", async () => {
    enableBothFlags();
    const caller = selfCaller();
    await caller.timesheet.clockIn({ employeeId: SELF_ID });
    mirror.mockClear();
    mirror.mockRejectedValueOnce(new Error("V2 down"));

    const out = await caller.timesheet.clockOut({ employeeId: SELF_ID });
    expect(out.success).toBe(true);
    expect(out.evaluation).toBeNull();
  });
});

describe("F1 - correcao cross-employee: espelha para o employee alvo", () => {
  // Regressao do furo caracterizado na F1: antes o mirror usava ctx.user e
  // ignorava input.employeeId (batida por-conta-de-outro divergia). Corrigido
  // para usar o employee RESOLVIDO.
  it("manager batendo por outro employeeId espelha para o employee alvo (nao o caller)", async () => {
    enableBothFlags();
    const managerCtx = {
      user: { id: 555, email: "manager@example.com", role: "gestor" },
      req: { headers: {} },
      res: { setHeader: () => {}, clearCookie: () => {} },
    };
    const caller = appRouter.createCaller(managerCtx as any);

    await caller.timesheet.clockIn({ employeeId: 888 }); // outro funcionario

    expect(mirror).toHaveBeenCalledTimes(1);
    const [employeeId] = mirror.mock.calls[0] as [number, any];
    // Corrigido: espelha para 888 (alvo), nao para 555 (caller/manager).
    expect(employeeId).toBe(888);
  });
});
