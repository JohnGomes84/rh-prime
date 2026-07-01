import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers.js";
import * as routinesDb from "../modules/operational-routines/db.js";

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

describe("operationalRoutines router", () => {
  it("bloqueia colaborador criando cliente", async () => {
    await expect(
      caller("colaborador").operationalRoutines.clients.create({ name: "Cliente A" }),
    ).rejects.toThrow(/admin|gestor/i);
  });

  it("permite gestor criar cliente sem dados sensiveis", async () => {
    const spy = vi.spyOn(routinesDb, "createClient").mockResolvedValue({ id: 1 });
    await expect(
      caller("gestor").operationalRoutines.clients.create({ name: "Cliente A" }),
    ).resolves.toEqual({ id: 1 });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ name: "Cliente A" }));
  });

  it("rejeita campos financeiros sensiveis em payload estrito", async () => {
    await expect(
      caller("gestor").operationalRoutines.clients.create({ name: "Cliente A", valor: 100 } as any),
    ).rejects.toThrow();
  });

  it("exige dia do mes para rotina mensal", async () => {
    await expect(
      caller("gestor").operationalRoutines.routines.create({
        clientId: 1,
        title: "Emitir nota",
        routineType: "nota_fiscal",
        frequency: "monthly",
      } as any),
    ).rejects.toThrow(/dia do mês/i);
  });

  it("permite atualizar ocorrencia sem perfil gerencial", async () => {
    const spy = vi.spyOn(routinesDb, "updateOccurrence").mockResolvedValue(undefined);
    await expect(
      caller("colaborador").operationalRoutines.occurrences.update({
        id: 9,
        status: "waiting_return",
        operationalNotes: "Aguardando retorno do cliente",
      }),
    ).resolves.toEqual({ ok: true });
    expect(spy).toHaveBeenCalledWith(9, expect.objectContaining({ status: "waiting_return" }));
  });
});
