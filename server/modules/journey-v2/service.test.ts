import { describe, expect, it } from "vitest";
import {
  buildJourneyDayTimeline,
  getJourneyDayEvaluation,
  resolveJourneyAdjustmentEventPayload,
  resolveJourneyPunchTransition,
  resolveJourneyTodayStatusFromSnapshot,
  summarizeJourneyPeriodEvaluations,
} from "./service.js";
import * as journeyEngine from "../../utils/journey-engine.js";
import { vi } from "vitest";

describe("resolveJourneyTodayStatusFromSnapshot", () => {
  it("retorna status sem vinculo quando snapshot e nulo", () => {
    const result = resolveJourneyTodayStatusFromSnapshot(null);

    expect(result.linkedEmployee).toBe(false);
    expect(result.canRegisterPunch).toBe(false);
    expect(result.employeeId).toBeNull();
  });

  it("propaga elegibilidade quando snapshot esta apto", () => {
    const result = resolveJourneyTodayStatusFromSnapshot({
      employeeId: 10,
      employeeStatus: "Ativo",
      contractId: 22,
      contractActive: true,
      hasPolicy: true,
      operationalCategory: "clt_padrao",
      requiresTimeTracking: true,
      requiresContextBinding: false,
      hasActiveAssignmentContext: false,
      contextRequirementSatisfied: true,
      pointRequirementMode: "always",
      policyId: 3,
      policyName: "CLT Base",
      referenceDate: "2026-07-22",
    });

    expect(result).toMatchObject({
      linkedEmployee: true,
      employeeId: 10,
      contractId: 22,
      policyId: 3,
      canRegisterPunch: true,
      reasonCode: "eligible",
    });
  });

  it("mantem motivo de contexto ausente para intermitente condicional", () => {
    const result = resolveJourneyTodayStatusFromSnapshot({
      employeeId: 10,
      employeeStatus: "Ativo",
      contractId: 22,
      contractActive: true,
      hasPolicy: true,
      operationalCategory: "intermitente_com_ponto_condicional",
      requiresTimeTracking: true,
      requiresContextBinding: true,
      hasActiveAssignmentContext: false,
      contextRequirementSatisfied: false,
      pointRequirementMode: "conditional_by_context",
      policyId: 4,
      policyName: "Intermitente por Contexto",
      referenceDate: "2026-07-22",
    });

    expect(result.canRegisterPunch).toBe(false);
    expect(result.reasonCode).toBe("missing_active_context");
  });
});

describe("resolveJourneyPunchTransition", () => {
  it("permite primeira entrada sem evento anterior", () => {
    expect(resolveJourneyPunchTransition(null, "clock_in")).toEqual({
      allowed: true,
      reasonCode: "ok",
    });
  });

  it("bloqueia saida sem entrada anterior", () => {
    expect(resolveJourneyPunchTransition(null, "clock_out")).toEqual({
      allowed: false,
      reasonCode: "missing_clock_in",
    });
  });

  it("bloqueia nova entrada com sessao aberta", () => {
    expect(resolveJourneyPunchTransition("clock_in", "clock_in")).toEqual({
      allowed: false,
      reasonCode: "open_session_exists",
    });
  });

  it("permite iniciar intervalo apos entrada", () => {
    expect(resolveJourneyPunchTransition("clock_in", "break_start")).toEqual({
      allowed: true,
      reasonCode: "ok",
    });
  });

  it("permite retornar do intervalo", () => {
    expect(resolveJourneyPunchTransition("break_start", "break_end")).toEqual({
      allowed: true,
      reasonCode: "ok",
    });
  });

  it("permite saida apos entrada", () => {
    expect(resolveJourneyPunchTransition("clock_in", "clock_out")).toEqual({
      allowed: true,
      reasonCode: "ok",
    });
  });

  it("permite nova entrada apos saida", () => {
    expect(resolveJourneyPunchTransition("clock_out", "clock_in")).toEqual({
      allowed: true,
      reasonCode: "ok",
    });
  });
});

describe("buildJourneyDayTimeline", () => {
  it("monta sessao fechada a partir de entrada e saida", () => {
    const timeline = buildJourneyDayTimeline(7, "2026-07-22", [
      { id: 1, eventType: "clock_in", occurredAt: "2026-07-22T08:00:00.000Z" },
      { id: 2, eventType: "clock_out", occurredAt: "2026-07-22T17:00:00.000Z" },
    ]);

    expect(timeline.sessions).toHaveLength(1);
    expect(timeline.openSession).toBeNull();
    expect(timeline.totalWorkedMinutes).toBe(540);
  });

  it("desconta intervalo explicito da sessao", () => {
    const timeline = buildJourneyDayTimeline(7, "2026-07-22", [
      { id: 1, eventType: "clock_in", occurredAt: "2026-07-22T08:00:00.000Z" },
      { id: 2, eventType: "break_start", occurredAt: "2026-07-22T12:00:00.000Z" },
      { id: 3, eventType: "break_end", occurredAt: "2026-07-22T13:00:00.000Z" },
      { id: 4, eventType: "clock_out", occurredAt: "2026-07-22T17:00:00.000Z" },
    ]);

    expect(timeline.sessions).toHaveLength(1);
    expect(timeline.sessions[0]?.breakMinutes).toBe(60);
    expect(timeline.sessions[0]?.workedMinutes).toBe(480);
    expect(timeline.totalBreakMinutes).toBe(60);
    expect(timeline.totalWorkedMinutes).toBe(480);
  });

  it("mantem sessao aberta quando nao ha saida", () => {
    const timeline = buildJourneyDayTimeline(7, "2026-07-22", [
      { id: 1, eventType: "clock_in", occurredAt: "2026-07-22T08:00:00.000Z" },
    ]);

    expect(timeline.sessions).toHaveLength(0);
    expect(timeline.openSession?.status).toBe("open");
    expect(timeline.firstClockInAt?.toISOString()).toBe("2026-07-22T08:00:00.000Z");
  });

  it("ignora saida sem entrada valida anterior", () => {
    const timeline = buildJourneyDayTimeline(7, "2026-07-22", [
      { id: 1, eventType: "clock_out", occurredAt: "2026-07-22T12:00:00.000Z" },
      { id: 2, eventType: "clock_in", occurredAt: "2026-07-22T13:00:00.000Z" },
    ]);

    expect(timeline.sessions).toHaveLength(0);
    expect(timeline.openSession?.startEventId).toBe(2);
  });
});

describe("getJourneyDayEvaluation", () => {
  it("retorna empty quando nao ha sessoes", async () => {
    const spy = vi.spyOn(journeyEngine, "getActiveScheduleRule").mockResolvedValue(null as any);
    const listSpy = vi.spyOn(await import("./service.js"), "listJourneyPunchEvents").mockResolvedValue([]);

    const result = await getJourneyDayEvaluation(7, "2026-07-22");

    expect(result.status).toBe("empty");
    expect(result.notes[0]).toContain("Nenhuma sessao");

    spy.mockRestore();
    listSpy.mockRestore();
  });
});

describe("resolveJourneyAdjustmentEventPayload", () => {
  it("deriva clock_in para missing_clock_in", () => {
    const result = resolveJourneyAdjustmentEventPayload({
      requestType: "missing_clock_in",
      payload: { occurredAt: "2026-07-22T08:00:00.000Z" },
    });

    expect(result?.eventType).toBe("clock_in");
  });

  it("deriva clock_out para missing_clock_out", () => {
    const result = resolveJourneyAdjustmentEventPayload({
      requestType: "missing_clock_out",
      payload: { occurredAt: "2026-07-22T17:00:00.000Z" },
    });

    expect(result?.eventType).toBe("clock_out");
  });

  it("deriva break_start para missing_break_start", () => {
    const result = resolveJourneyAdjustmentEventPayload({
      requestType: "missing_break_start",
      payload: { occurredAt: "2026-07-22T12:00:00.000Z" },
    });

    expect(result?.eventType).toBe("break_start");
  });

  it("deriva break_end para missing_break_end", () => {
    const result = resolveJourneyAdjustmentEventPayload({
      requestType: "missing_break_end",
      payload: { occurredAt: "2026-07-22T13:00:00.000Z" },
    });

    expect(result?.eventType).toBe("break_end");
  });

  it("respeita eventType no manual_correction", () => {
    const result = resolveJourneyAdjustmentEventPayload({
      requestType: "manual_correction",
      payload: { eventType: "clock_in", occurredAt: "2026-07-22T09:15:00.000Z" },
    });

    expect(result?.eventType).toBe("clock_in");
  });

  it("retorna null quando payload nao e aplicavel", () => {
    const result = resolveJourneyAdjustmentEventPayload({
      requestType: "wrong_context",
      payload: { occurredAt: "2026-07-22T09:15:00.000Z" },
    });

    expect(result).toBeNull();
  });
});

describe("summarizeJourneyPeriodEvaluations", () => {
  it("marca periodo como fechavel quando nao ha dias abertos nem inconsistentes", () => {
    const summary = summarizeJourneyPeriodEvaluations({
      employeeId: 1,
      periodStart: "2026-07-01",
      periodEnd: "2026-07-03",
      evaluations: [
        { status: "closed", workedMinutes: 480, expectedMinutes: 480, overtimeMinutes: 0, delayMinutes: 0 },
        { status: "closed", workedMinutes: 500, expectedMinutes: 480, overtimeMinutes: 20, delayMinutes: 0 },
      ],
    });

    expect(summary.closable).toBe(true);
    expect(summary.closedDays).toBe(2);
    expect(summary.totalWorkedMinutes).toBe(980);
  });

  it("marca periodo como nao fechavel quando ha dia aberto", () => {
    const summary = summarizeJourneyPeriodEvaluations({
      employeeId: 1,
      periodStart: "2026-07-01",
      periodEnd: "2026-07-02",
      evaluations: [
        { status: "closed", workedMinutes: 480, expectedMinutes: 480, overtimeMinutes: 0, delayMinutes: 0 },
        { status: "open", workedMinutes: 0, expectedMinutes: 0, overtimeMinutes: 0, delayMinutes: 0 },
      ],
    });

    expect(summary.closable).toBe(false);
    expect(summary.openDays).toBe(1);
  });
});
