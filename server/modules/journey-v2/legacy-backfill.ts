/**
 * F2 - Backfill de eventos-sombra do Journey V2 a partir de `time_records`.
 *
 * Logica PURA (sem DB) para ser testavel. O runner
 * `scripts/backfill-journey-from-timerecords.ts` usa estas funcoes + mysql2.
 *
 * Decisao (F2, opcao B): eventos-sombra ficam FORA da cadeia oficial NSR/hash.
 * Cada sombra e marcada `is_shadow_from_legacy=1`, `integrity_status=
 * 'legacy_unverified'`, `nsr=NULL`, `previous_hash/event_hash=NULL`,
 * `source='import'`. Assim os helpers da cadeia (getNextJourneyNsr /
 * getLastJourneyEventHash) ignoram as sombras e a integridade das batidas
 * reais (F3) fica intacta.
 */

export type LegacyTimeRecord = {
  id: number;
  employeeId: number | null;
  clockIn: Date | string;
  clockOut: Date | string | null;
};

export type ShadowPunchEvent = {
  employeeId: number;
  occurredAt: Date;
  eventType: "clock_in" | "clock_out";
  source: "import";
  sourceReference: string;
  isShadowFromLegacy: true;
  legacyTimeRecordId: number;
  integrityStatus: "legacy_unverified";
  nsr: null;
  previousHash: null;
  eventHash: null;
  timezone: "America/Sao_Paulo";
};

/**
 * Converte um `time_record` nas suas sombras: sempre 1 `clock_in`; + 1
 * `clock_out` se o registro estiver fechado. Registros sem employee vinculado
 * nao geram sombra (nao ha para quem atribuir).
 */
export function timeRecordToShadowEvents(tr: LegacyTimeRecord): ShadowPunchEvent[] {
  if (tr.employeeId == null) return [];

  const base = {
    employeeId: tr.employeeId,
    source: "import" as const,
    isShadowFromLegacy: true as const,
    legacyTimeRecordId: tr.id,
    integrityStatus: "legacy_unverified" as const,
    nsr: null,
    previousHash: null,
    eventHash: null,
    timezone: "America/Sao_Paulo" as const,
  };

  const events: ShadowPunchEvent[] = [
    {
      ...base,
      eventType: "clock_in",
      occurredAt: new Date(tr.clockIn),
      sourceReference: `legacy_time_record:${tr.id}:clock_in`,
    },
  ];

  if (tr.clockOut) {
    events.push({
      ...base,
      eventType: "clock_out",
      occurredAt: new Date(tr.clockOut),
      sourceReference: `legacy_time_record:${tr.id}:clock_out`,
    });
  }

  return events;
}

export function shadowKey(legacyTimeRecordId: number, eventType: string): string {
  return `${legacyTimeRecordId}:${eventType}`;
}

/**
 * Idempotencia: remove os eventos cuja chave (legacy_time_record_id + tipo) ja
 * existe entre as sombras gravadas. Rodar o backfill N vezes so insere o que
 * falta.
 */
export function selectMissingShadowEvents(
  events: ShadowPunchEvent[],
  existingKeys: Set<string>,
): ShadowPunchEvent[] {
  return events.filter((e) => !existingKeys.has(shadowKey(e.legacyTimeRecordId, e.eventType)));
}

export type BackfillVerification = {
  ok: boolean;
  expectedRecordCount: number;
  expectedClosedCount: number;
  expectedShadowTotal: number;
  shadowTotal: number;
  shadowDistinctLegacyIds: number;
  problems: string[];
};

/**
 * Validacao pos-backfill. `expectedRecordCount` = time_records elegiveis (com
 * employee); `expectedClosedCount` = quantos desses estao fechados (tem
 * clock_out). Esperado: 1 clock_in por registro + 1 clock_out por fechado, e o
 * numero de legacy_time_record_id distintos igual ao de registros elegiveis.
 */
export function verifyBackfill(input: {
  expectedRecordCount: number;
  expectedClosedCount: number;
  shadowTotal: number;
  shadowDistinctLegacyIds: number;
}): BackfillVerification {
  const expectedShadowTotal = input.expectedRecordCount + input.expectedClosedCount;
  const problems: string[] = [];

  if (input.shadowDistinctLegacyIds !== input.expectedRecordCount) {
    problems.push(
      `legacy_time_record_id distintos (${input.shadowDistinctLegacyIds}) != time_records elegiveis (${input.expectedRecordCount})`,
    );
  }
  if (input.shadowTotal !== expectedShadowTotal) {
    problems.push(
      `total de sombras (${input.shadowTotal}) != esperado (${expectedShadowTotal} = ${input.expectedRecordCount} clock_in + ${input.expectedClosedCount} clock_out)`,
    );
  }

  return {
    ok: problems.length === 0,
    expectedRecordCount: input.expectedRecordCount,
    expectedClosedCount: input.expectedClosedCount,
    expectedShadowTotal,
    shadowTotal: input.shadowTotal,
    shadowDistinctLegacyIds: input.shadowDistinctLegacyIds,
    problems,
  };
}
