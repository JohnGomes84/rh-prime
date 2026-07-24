/**
 * F2 - Testes da logica pura do backfill (eventos-sombra a partir de time_records).
 *
 * Prova: campos corretos, sombras FORA da cadeia (nsr/hash NULL), idempotencia,
 * e a validacao pos-backfill batendo a contagem. Roda sem DB.
 */
import { describe, it, expect } from "vitest";
import {
  timeRecordToShadowEvents,
  selectMissingShadowEvents,
  shadowKey,
  verifyBackfill,
  type LegacyTimeRecord,
  type ShadowPunchEvent,
} from "./legacy-backfill.js";

const closed: LegacyTimeRecord = {
  id: 10,
  employeeId: 3,
  clockIn: new Date("2026-07-01T08:00:00Z"),
  clockOut: new Date("2026-07-01T17:00:00Z"),
};
const open: LegacyTimeRecord = {
  id: 11,
  employeeId: 3,
  clockIn: new Date("2026-07-02T08:00:00Z"),
  clockOut: null,
};
const noEmployee: LegacyTimeRecord = {
  id: 12,
  employeeId: null,
  clockIn: new Date("2026-07-03T08:00:00Z"),
  clockOut: new Date("2026-07-03T17:00:00Z"),
};

describe("F2 - timeRecordToShadowEvents", () => {
  it("registro fechado gera clock_in + clock_out com os timestamps corretos", () => {
    const events = timeRecordToShadowEvents(closed);
    expect(events.map((e) => e.eventType)).toEqual(["clock_in", "clock_out"]);
    expect(events[0].occurredAt.toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(events[1].occurredAt.toISOString()).toBe("2026-07-01T17:00:00.000Z");
    expect(events[0].legacyTimeRecordId).toBe(10);
    expect(events[0].employeeId).toBe(3);
    expect(events[0].sourceReference).toBe("legacy_time_record:10:clock_in");
    expect(events[1].sourceReference).toBe("legacy_time_record:10:clock_out");
  });

  it("registro aberto gera apenas clock_in", () => {
    const events = timeRecordToShadowEvents(open);
    expect(events.map((e) => e.eventType)).toEqual(["clock_in"]);
  });

  it("registro sem employee nao gera sombra", () => {
    expect(timeRecordToShadowEvents(noEmployee)).toEqual([]);
  });

  it("sombras ficam FORA da cadeia oficial: nsr/hash NULL, legacy_unverified, source import", () => {
    const events = [
      ...timeRecordToShadowEvents(closed),
      ...timeRecordToShadowEvents(open),
    ];
    for (const e of events) {
      expect(e.nsr).toBeNull();
      expect(e.previousHash).toBeNull();
      expect(e.eventHash).toBeNull();
      expect(e.integrityStatus).toBe("legacy_unverified");
      expect(e.source).toBe("import");
      expect(e.isShadowFromLegacy).toBe(true);
      expect(e.timezone).toBe("America/Sao_Paulo");
    }
  });
});

describe("F2 - idempotencia (selectMissingShadowEvents)", () => {
  it("sem sombras existentes: retorna todos", () => {
    const events = timeRecordToShadowEvents(closed);
    expect(selectMissingShadowEvents(events, new Set()).length).toBe(2);
  });

  it("com uma chave ja existente: pula so ela", () => {
    const events = timeRecordToShadowEvents(closed);
    const existing = new Set([shadowKey(10, "clock_in")]);
    const missing = selectMissingShadowEvents(events, existing);
    expect(missing.map((e) => e.eventType)).toEqual(["clock_out"]);
  });

  it("rerun (todas as chaves existem): retorna vazio -> nao duplica", () => {
    const events = timeRecordToShadowEvents(closed);
    const existing = new Set(events.map((e) => shadowKey(e.legacyTimeRecordId, e.eventType)));
    expect(selectMissingShadowEvents(events, existing)).toEqual([]);
  });
});

describe("F2 - validacao pos-backfill (verifyBackfill), fixture de 9 registros", () => {
  // 9 time_records elegiveis: 8 fechados + 1 aberto -> 9 clock_in + 8 clock_out = 17 sombras.
  function build9(): { records: LegacyTimeRecord[]; events: ShadowPunchEvent[] } {
    const records: LegacyTimeRecord[] = [];
    for (let i = 1; i <= 8; i++) {
      records.push({
        id: 100 + i,
        employeeId: 3,
        clockIn: new Date(`2026-07-${String(i).padStart(2, "0")}T08:00:00Z`),
        clockOut: new Date(`2026-07-${String(i).padStart(2, "0")}T17:00:00Z`),
      });
    }
    records.push({ id: 200, employeeId: 3, clockIn: new Date("2026-07-09T08:00:00Z"), clockOut: null });
    const events = records.flatMap(timeRecordToShadowEvents);
    return { records, events };
  }

  it("primeira passada: 9 registros -> 17 sombras (9 distintos), verify OK", () => {
    const { events } = build9();
    const missing = selectMissingShadowEvents(events, new Set());
    expect(missing.length).toBe(17);

    const distinct = new Set(missing.map((e) => e.legacyTimeRecordId)).size;
    const result = verifyBackfill({
      expectedRecordCount: 9,
      expectedClosedCount: 8,
      shadowTotal: missing.length,
      shadowDistinctLegacyIds: distinct,
    });
    // "bate 9": legacy_time_record_id distintos == 9 registros.
    expect(result.shadowDistinctLegacyIds).toBe(9);
    expect(result.expectedShadowTotal).toBe(17);
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it("segunda passada (idempotente): 0 novas sombras, verify continua OK", () => {
    const { events } = build9();
    const existing = new Set(events.map((e) => shadowKey(e.legacyTimeRecordId, e.eventType)));
    const missing = selectMissingShadowEvents(events, existing);
    expect(missing.length).toBe(0);

    // Estado final do banco (o que ja estava la) continua batendo.
    const distinct = new Set(events.map((e) => e.legacyTimeRecordId)).size;
    const result = verifyBackfill({
      expectedRecordCount: 9,
      expectedClosedCount: 8,
      shadowTotal: events.length,
      shadowDistinctLegacyIds: distinct,
    });
    expect(result.ok).toBe(true);
  });

  it("verify falha se faltar sombra (backfill incompleto)", () => {
    const result = verifyBackfill({
      expectedRecordCount: 9,
      expectedClosedCount: 8,
      shadowTotal: 15, // faltando 2
      shadowDistinctLegacyIds: 8, // um registro sem sombra
    });
    expect(result.ok).toBe(false);
    expect(result.problems.length).toBeGreaterThan(0);
  });
});
