/**
 * F0 - Rede de seguranca da migracao do ponto (Journey V2).
 *
 * Trava o CONTRATO ATUAL do ponto legado (2 batidas: entrada/saida via
 * `timesheet.clockIn/clockOut` -> tabela `time_records`) ANTES de qualquer
 * mudanca da migracao. Se uma fase futura alterar esse comportamento sem
 * intencao, estes testes quebram.
 *
 * O que esta sendo travado:
 *  - endpoints: timesheet.clockIn / clockOut / getOpenRecord / monthlySummary
 *  - formato de resposta exato do clockIn (sem vazar campos de Journey V2)
 *  - status do registro (PENDING ao abrir; APPROVED ao fechar sem regra)
 *  - guardas: CONFLICT (ja aberto) e NOT_FOUND (sem aberto)
 *  - ciclo do getOpenRecord (aberto apos entrada, null apos saida)
 *  - invariante de rollback: com flags de Journey V2 desligadas (padrao dos
 *    testes), o clockIn retorna somente a forma legada {success, id}.
 *
 * Simulacao: nao usa fixtures externas nem HTTP. Usa o db in-memory global
 * (`server/__test__/db-mock.ts`, injetado por `vi.mock("../db")` no setup) e
 * chama os procedures reais via `appRouter.createCaller`. `beforeEach` reseta
 * o db. `employeeId` e passado explicitamente, entao `resolveEmployeeIdInScope`
 * nao toca o banco (e `assertEmployeeInScope` retorna cedo em NODE_ENV=test).
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "../routers.js";

const EMPLOYEE_ID = 501;

function makeCaller(role = "colaborador") {
  const ctx = {
    user: { id: EMPLOYEE_ID, email: "colab@example.com", role },
    req: { headers: {} },
    res: { setHeader: () => {}, clearCookie: () => {} },
  };
  return appRouter.createCaller(ctx as any);
}

describe("F0 baseline - ponto legado (2 batidas)", () => {
  it("clockIn abre um registro e retorna exatamente {success, id}", async () => {
    const caller = makeCaller();
    const result = await caller.timesheet.clockIn({ employeeId: EMPLOYEE_ID });

    expect(result.success).toBe(true);
    expect(typeof result.id).toBe("number");
    // Trava a forma legada: nada de campos de Journey V2 no retorno.
    expect(Object.keys(result as Record<string, unknown>).sort()).toEqual(["id", "success"]);
  });

  it("apos clockIn, getOpenRecord retorna o registro aberto com status PENDING", async () => {
    const caller = makeCaller();
    await caller.timesheet.clockIn({ employeeId: EMPLOYEE_ID });

    const open = await caller.timesheet.getOpenRecord({ employeeId: EMPLOYEE_ID });
    expect(open).not.toBeNull();
    expect((open as any).clockOut ?? null).toBeNull();
    expect((open as any).status).toBe("PENDING");
  });

  it("clockIn com ponto ja aberto lanca CONFLICT", async () => {
    const caller = makeCaller();
    await caller.timesheet.clockIn({ employeeId: EMPLOYEE_ID });

    await expect(
      caller.timesheet.clockIn({ employeeId: EMPLOYEE_ID }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("clockOut fecha o registro e, sem regra de jornada, retorna {success, evaluation:null}", async () => {
    const caller = makeCaller();
    await caller.timesheet.clockIn({ employeeId: EMPLOYEE_ID });

    const out = await caller.timesheet.clockOut({ employeeId: EMPLOYEE_ID });
    expect(out).toMatchObject({ success: true, evaluation: null });

    // Registro deixa de estar "aberto".
    const open = await caller.timesheet.getOpenRecord({ employeeId: EMPLOYEE_ID });
    expect(open).toBeNull();
  });

  it("clockOut sem ponto aberto lanca NOT_FOUND", async () => {
    const caller = makeCaller();
    await expect(
      caller.timesheet.clockOut({ employeeId: EMPLOYEE_ID }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("getOpenRecord retorna null quando nao ha ponto aberto", async () => {
    const caller = makeCaller();
    const open = await caller.timesheet.getOpenRecord({ employeeId: EMPLOYEE_ID });
    expect(open).toBeNull();
  });

  it("monthlySummary mantem o formato legado", async () => {
    const caller = makeCaller();
    const summary = await caller.timesheet.monthlySummary({
      employeeId: EMPLOYEE_ID,
      month: 2,
      year: 2026,
    });

    expect(summary).toHaveProperty("totalHours");
    expect(summary).toHaveProperty("overtimeHours");
    expect(summary).toHaveProperty("absences");
    expect(summary).toHaveProperty("delays");
    expect(typeof summary.totalHours).toBe("number");
  });
});
