import { describe, it, expect, vi, afterEach } from "vitest";
import { appRouter } from "../routers.js";
import * as db from "../db.js";

function caller(role: string, id = 1) {
  return appRouter.createCaller({
    user: { id, email: "x@y.z", role },
    req: { headers: {} },
    res: { setHeader: () => {}, clearCookie: () => {}, cookie: () => {} },
  } as any);
}

const feriasReq = {
  id: 10,
  kind: "ferias",
  status: "PENDING",
  employeeId: 7,
  payload: { vacationId: 3, startDate: "2026-08-01", endDate: "2026-08-30", abonoDays: 0 },
};

afterEach(() => vi.restoreAllMocks());

describe("inbox.decide — ferias approval hook", () => {
  it("aprovar cria período de férias e incrementa daysTaken com days derivado no servidor", async () => {
    vi.spyOn(db, "getRequest").mockResolvedValue({ ...feriasReq } as any);
    vi.spyOn(db, "createApproval").mockResolvedValue(undefined as any);
    vi.spyOn(db, "updateRequest").mockResolvedValue({ success: true } as any);
    const createPeriod = vi.spyOn(db, "createVacationPeriod").mockResolvedValue({ id: 99 } as any);
    vi.spyOn(db, "getVacation").mockResolvedValue({ id: 3, daysTaken: 0, daysEntitled: 30 } as any);
    const updateVac = vi.spyOn(db, "updateVacation").mockResolvedValue({ success: true } as any);

    await caller("admin").inbox.decide({ id: 10, decision: "APPROVED" });

    expect(createPeriod).toHaveBeenCalledTimes(1);
    const periodArg = createPeriod.mock.calls[0][0] as any;
    expect(periodArg.days).toBe(30); // 01→30 ago, inclusivo
    expect(periodArg.vacationId).toBe(3);
    expect(periodArg.employeeId).toBe(7);
    expect(updateVac).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ daysTaken: 30, status: "Agendada" }),
    );
  });

  it("ignora 'days' adulterado no payload e usa o valor derivado das datas", async () => {
    vi.spyOn(db, "getRequest").mockResolvedValue({
      ...feriasReq,
      payload: { ...feriasReq.payload, days: 1 },
    } as any);
    vi.spyOn(db, "createApproval").mockResolvedValue(undefined as any);
    vi.spyOn(db, "updateRequest").mockResolvedValue({ success: true } as any);
    const createPeriod = vi.spyOn(db, "createVacationPeriod").mockResolvedValue({ id: 99 } as any);
    vi.spyOn(db, "getVacation").mockResolvedValue({ id: 3, daysTaken: 0, daysEntitled: 30 } as any);
    vi.spyOn(db, "updateVacation").mockResolvedValue({ success: true } as any);

    await caller("admin").inbox.decide({ id: 10, decision: "APPROVED" });

    expect((createPeriod.mock.calls[0][0] as any).days).toBe(30);
  });

  it("não decide uma solicitação já resolvida (idempotência) e não cria período", async () => {
    vi.spyOn(db, "getRequest").mockResolvedValue({ ...feriasReq, status: "APPROVED" } as any);
    const createPeriod = vi.spyOn(db, "createVacationPeriod").mockResolvedValue({ id: 99 } as any);
    const updateVac = vi.spyOn(db, "updateVacation").mockResolvedValue({ success: true } as any);

    await expect(
      caller("admin").inbox.decide({ id: 10, decision: "APPROVED" }),
    ).rejects.toThrow(/já foi decidida/i);
    expect(createPeriod).not.toHaveBeenCalled();
    expect(updateVac).not.toHaveBeenCalled();
  });

  it("rejeitar não cria período de férias", async () => {
    vi.spyOn(db, "getRequest").mockResolvedValue({ ...feriasReq } as any);
    vi.spyOn(db, "createApproval").mockResolvedValue(undefined as any);
    vi.spyOn(db, "updateRequest").mockResolvedValue({ success: true } as any);
    const createPeriod = vi.spyOn(db, "createVacationPeriod").mockResolvedValue({ id: 99 } as any);

    await caller("admin").inbox.decide({ id: 10, decision: "REJECTED" });

    expect(createPeriod).not.toHaveBeenCalled();
  });
});
