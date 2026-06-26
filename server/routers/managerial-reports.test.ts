import { describe, it, expect } from "vitest";
import { appRouter } from "../routers.js";

function caller(role: string) {
  return appRouter.createCaller({
    user: { id: 1, email: "x@y.z", role },
    req: { headers: {} },
    res: { setHeader: () => {}, clearCookie: () => {}, cookie: () => {} },
  } as any);
}

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
});
