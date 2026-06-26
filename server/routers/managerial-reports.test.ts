import { describe, it, expect, vi, afterEach } from "vitest";
import { appRouter } from "../routers.js";
import * as mrDb from "../modules/managerial-reports/db.js";

function caller(role: string, id = 1) {
  return appRouter.createCaller({
    user: { id, email: "x@y.z", role },
    req: { headers: {} },
    res: { setHeader: () => {}, clearCookie: () => {}, cookie: () => {} },
  } as any);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("managerialReports authorization", () => {
  it("colaborador não pode validar (FORBIDDEN antes do DB)", async () => {
    await expect(
      caller("colaborador").managerialReports.validate({ id: 1, approve: true }),
    ).rejects.toThrow();
  });

  it("user comum não pode validar", async () => {
    await expect(
      caller("user").managerialReports.validate({ id: 1, approve: true }),
    ).rejects.toThrow();
  });

  it("usuário não autenticado é bloqueado em listReports", async () => {
    const anon = appRouter.createCaller({
      user: null,
      req: { headers: {} },
      res: { setHeader: () => {}, clearCookie: () => {}, cookie: () => {} },
    } as any);
    await expect(anon.managerialReports.listReports({})).rejects.toThrow();
  });

  it("colaborador que não é autor não pode editar o relatório (FORBIDDEN)", async () => {
    vi.spyOn(mrDb, "getReport").mockResolvedValue({
      report: { id: 5, authorId: 999, status: "rascunho", dueDate: "2026-06-30" } as any,
      items: [],
    });
    await expect(
      caller("colaborador", 1).managerialReports.updateReport({ id: 5, summary: "x" }),
    ).rejects.toThrow(/autor|validador/i);
  });

  it("colaborador que não é autor não pode enviar para validação (FORBIDDEN)", async () => {
    vi.spyOn(mrDb, "getReport").mockResolvedValue({
      report: { id: 5, authorId: 999, status: "rascunho", dueDate: "2026-06-30" } as any,
      items: [],
    });
    await expect(
      caller("colaborador", 1).managerialReports.submitForValidation({ id: 5 }),
    ).rejects.toThrow(/autor|validador/i);
  });

  it("colaborador só lista os próprios relatórios (escopo por authorId)", async () => {
    const spy = vi.spyOn(mrDb, "listReports").mockResolvedValue([]);
    await caller("colaborador", 7).managerialReports.listReports({});
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ authorId: 7 }));
  });

  it("validador (gestor) lista todos os relatórios (sem filtro de autor)", async () => {
    const spy = vi.spyOn(mrDb, "listReports").mockResolvedValue([]);
    await caller("gestor", 7).managerialReports.listReports({});
    expect(spy).toHaveBeenCalledWith(expect.not.objectContaining({ authorId: expect.anything() }));
  });

  it("colaborador não-autor recebe NOT_FOUND ao abrir relatório alheio", async () => {
    vi.spyOn(mrDb, "getReport").mockResolvedValue({
      report: { id: 5, authorId: 999, status: "enviado", dueDate: "2026-06-30" } as any,
      items: [],
    });
    await expect(
      caller("colaborador", 1).managerialReports.getReport({ id: 5 }),
    ).rejects.toThrow(/não encontrado/i);
  });

  it("updateItem rejeita itemId que não pertence ao reportId (anti-IDOR)", async () => {
    // Caller IS the author (passes ownership), but the itemId belongs to another report.
    vi.spyOn(mrDb, "getReport").mockResolvedValue({
      report: { id: 5, authorId: 1, status: "rascunho", dueDate: "2026-06-30" } as any,
      items: [{ id: 10, reportId: 5 } as any],
    });
    const spy = vi.spyOn(mrDb, "updateItemFields").mockResolvedValue(undefined);
    await expect(
      caller("colaborador", 1).managerialReports.updateItem({ reportId: 5, itemId: 999, value: "x" }),
    ).rejects.toThrow(/não encontrado/i);
    expect(spy).not.toHaveBeenCalled();
  });
});
