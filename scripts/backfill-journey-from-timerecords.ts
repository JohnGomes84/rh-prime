/**
 * F2 - Backfill: cria eventos-sombra do Journey V2 a partir de `time_records`.
 *
 * Idempotente (roda N vezes, nao duplica): pula pares
 * (legacy_time_record_id, event_type) que ja existem como sombra `source=import`.
 * Sombras ficam FORA da cadeia oficial (nsr/hash NULL, integrity_status
 * 'legacy_unverified') e sao logadas em journey_audit_trail.
 *
 * Uso (roda em dev/copia; prod so com aprovacao):
 *   pnpm tsx scripts/backfill-journey-from-timerecords.ts            # aplica
 *   pnpm tsx scripts/backfill-journey-from-timerecords.ts --dry-run  # so mostra
 *   pnpm tsx scripts/backfill-journey-from-timerecords.ts --verify   # so valida
 *
 * Exige DATABASE_URL (.env.local ou env).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mysql from "mysql2/promise";
import {
  timeRecordToShadowEvents,
  selectMissingShadowEvents,
  shadowKey,
  verifyBackfill,
  type LegacyTimeRecord,
  type ShadowPunchEvent,
} from "../server/modules/journey-v2/legacy-backfill.js";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const VERIFY_ONLY = args.has("--verify");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nao definido (.env.local ou env).");
  process.exit(1);
}
const needsTls = /tidbcloud\.com|sslmode=require|ssl=true/i.test(url);

const conn = await mysql.createConnection({
  uri: url,
  ...(needsTls ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
});

// mysql2 `execute` resolve para [rows, fields]; destructurando [x], x ja e o
// array de linhas.
function count(execResult: unknown): number {
  const arr = (Array.isArray(execResult) ? execResult : []) as Array<{ n?: number }>;
  return Number(arr[0]?.n ?? 0);
}

async function runVerify() {
  const [rc] = await conn.execute(
    "SELECT COUNT(*) n FROM time_records WHERE employee_id IS NOT NULL",
  );
  const [cc] = await conn.execute(
    "SELECT COUNT(*) n FROM time_records WHERE employee_id IS NOT NULL AND clock_out IS NOT NULL",
  );
  const [st] = await conn.execute(
    "SELECT COUNT(*) n FROM journey_punch_events WHERE is_shadow_from_legacy = 1 AND source = 'import'",
  );
  const [sd] = await conn.execute(
    "SELECT COUNT(DISTINCT legacy_time_record_id) n FROM journey_punch_events WHERE is_shadow_from_legacy = 1 AND source = 'import'",
  );
  const result = verifyBackfill({
    expectedRecordCount: count(rc),
    expectedClosedCount: count(cc),
    shadowTotal: count(st),
    shadowDistinctLegacyIds: count(sd),
  });

  console.log("\n=== VALIDACAO POS-BACKFILL ===");
  console.log(`time_records elegiveis:       ${result.expectedRecordCount}`);
  console.log(`  fechados (com clock_out):   ${result.expectedClosedCount}`);
  console.log(`sombras (import) total:        ${result.shadowTotal}`);
  console.log(`sombras legacy_id distintos:   ${result.shadowDistinctLegacyIds}`);
  console.log(`esperado (total sombras):      ${result.expectedShadowTotal}`);
  console.log(result.ok ? "RESULTADO: OK (bate)" : `RESULTADO: FALHA -> ${result.problems.join(" | ")}`);
  return result;
}

async function runBackfill() {
  const [trRows] = await conn.execute(
    "SELECT id, employee_id AS employeeId, clock_in AS clockIn, clock_out AS clockOut FROM time_records ORDER BY id ASC",
  );
  const records = (Array.isArray(trRows) ? trRows : []) as unknown as LegacyTimeRecord[];

  const [existRows] = await conn.execute(
    "SELECT legacy_time_record_id AS legacyId, event_type AS eventType FROM journey_punch_events WHERE is_shadow_from_legacy = 1 AND source = 'import'",
  );
  const existingRows = (Array.isArray(existRows) ? existRows : []) as Array<{ legacyId: number; eventType: string }>;
  const existingKeys = new Set(
    existingRows.map((r) => shadowKey(Number(r.legacyId), String(r.eventType))),
  );

  const allEvents: ShadowPunchEvent[] = records.flatMap(timeRecordToShadowEvents);
  const missing = selectMissingShadowEvents(allEvents, existingKeys);

  const skippedNoEmployee = records.filter((r) => r.employeeId == null).length;
  console.log(
    `time_records: ${records.length} (sem employee, ignorados: ${skippedNoEmployee}) | ` +
      `sombras esperadas: ${allEvents.length} | ja existem: ${allEvents.length - missing.length} | a inserir: ${missing.length}`,
  );

  if (DRY_RUN) {
    console.log("[dry-run] Nao insere. Amostra do que seria inserido:");
    for (const e of missing.slice(0, 6)) {
      console.log(`  emp=${e.employeeId} ${e.eventType} @ ${e.occurredAt.toISOString()} ref=${e.sourceReference}`);
    }
    return;
  }

  let inserted = 0;
  for (const e of missing) {
    const [res]: any = await conn.execute(
      `INSERT INTO journey_punch_events
         (employee_id, occurred_at, event_type, source, source_reference,
          is_shadow_from_legacy, legacy_time_record_id, integrity_status,
          nsr, previous_hash, event_hash, timezone)
       VALUES (?, ?, ?, 'import', ?, 1, ?, 'legacy_unverified', NULL, NULL, NULL, ?)`,
      [
        e.employeeId,
        e.occurredAt,
        e.eventType,
        e.sourceReference,
        e.legacyTimeRecordId,
        e.timezone,
      ],
    );
    const eventId = Number(res?.insertId ?? 0);
    if (eventId > 0) {
      await conn.execute(
        `INSERT INTO journey_audit_trail (entity_type, entity_id, action_type, payload_json)
         VALUES ('punch_event', ?, 'legacy_backfill_import', ?)`,
        [eventId, JSON.stringify({ legacyTimeRecordId: e.legacyTimeRecordId, eventType: e.eventType })],
      );
    }
    inserted++;
  }
  console.log(`Inseridas ${inserted} sombra(s).`);
}

try {
  if (VERIFY_ONLY) {
    const r = await runVerify();
    await conn.end();
    process.exit(r.ok ? 0 : 1);
  }

  await runBackfill();
  const r = await runVerify();
  await conn.end();
  if (!r.ok) {
    console.error("\nBackfill terminou mas a validacao FALHOU (backfill incompleto).");
    process.exit(1);
  }
  console.log("\nBackfill + validacao concluidos.");
} catch (error) {
  console.error("Falha no backfill:", error instanceof Error ? error.message : error);
  await conn.end().catch(() => undefined);
  process.exit(1);
}
