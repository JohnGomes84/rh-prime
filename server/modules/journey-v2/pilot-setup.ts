import { sql } from "drizzle-orm";
import { getDb } from "../../db.js";

// Embedded DDL (mirror of drizzle/0034_journey_v2_foundation.sql) so the setup
// runs from the server's own DB connection without needing the migration file
// at runtime. Idempotent: "already exists" errors are ignored.
const JOURNEY_V2_DDL = `
CREATE TABLE \`journey_policies\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`name\` varchar(160) NOT NULL,
	\`operational_category\` enum('clt_padrao','clt_alocado','clt_multiposto','intermitente_com_ponto_condicional','sem_ponto') NOT NULL,
	\`requires_time_tracking\` boolean NOT NULL DEFAULT true,
	\`break_mode\` enum('explicit_break_required','explicit_break_optional','auto_deduct_legacy_compat') NOT NULL DEFAULT 'explicit_break_required',
	\`schedule_type\` varchar(40),
	\`default_work_days\` json,
	\`default_start_time\` varchar(5),
	\`default_end_time\` varchar(5),
	\`default_break_minutes\` int,
	\`tolerance_minutes\` int NOT NULL DEFAULT 5,
	\`hour_bank_enabled\` boolean NOT NULL DEFAULT false,
	\`night_shift_enabled\` boolean NOT NULL DEFAULT false,
	\`requires_context_binding\` boolean NOT NULL DEFAULT false,
	\`allow_multiple_sessions_per_day\` boolean NOT NULL DEFAULT false,
	\`allow_cross_post_day\` boolean NOT NULL DEFAULT false,
	\`evidence_policy_geo\` enum('disabled','optional','required') NOT NULL DEFAULT 'optional',
	\`evidence_policy_selfie\` enum('disabled','optional','required') NOT NULL DEFAULT 'optional',
	\`evidence_policy_fingerprint\` enum('disabled','optional','required') NOT NULL DEFAULT 'disabled',
	\`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	\`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`journey_policies_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jpol_status\` ON \`journey_policies\` (\`status\`);--> statement-breakpoint
CREATE INDEX \`idx_jpol_category\` ON \`journey_policies\` (\`operational_category\`);--> statement-breakpoint
CREATE UNIQUE INDEX \`uq_jpol_name\` ON \`journey_policies\` (\`name\`);--> statement-breakpoint
CREATE TABLE \`journey_policy_assignments\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`employee_id\` int NOT NULL,
	\`contract_id\` int,
	\`client_id\` int,
	\`post_id\` int,
	\`journey_policy_id\` int NOT NULL,
	\`starts_on\` date NOT NULL,
	\`ends_on\` date,
	\`priority\` int NOT NULL DEFAULT 100,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`journey_policy_assignments_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jpa_employee_starts\` ON \`journey_policy_assignments\` (\`employee_id\`,\`starts_on\`);--> statement-breakpoint
CREATE INDEX \`idx_jpa_contract_starts\` ON \`journey_policy_assignments\` (\`contract_id\`,\`starts_on\`);--> statement-breakpoint
CREATE INDEX \`idx_jpa_policy\` ON \`journey_policy_assignments\` (\`journey_policy_id\`);--> statement-breakpoint
CREATE TABLE \`journey_punch_events\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`employee_id\` int NOT NULL,
	\`contract_id\` int,
	\`occurred_at\` timestamp NOT NULL,
	\`event_type\` enum('clock_in','break_start','break_end','clock_out','manual_adjustment','imported_event','system_correction') NOT NULL,
	\`source\` enum('web','mobile','admin_manual','legacy_shadow','import','api') NOT NULL,
	\`source_reference\` varchar(120),
	\`client_id\` int,
	\`post_id\` int,
	\`context_assignment_ref\` varchar(120),
	\`nsr\` int,
	\`previous_hash\` varchar(64),
	\`event_hash\` varchar(64),
	\`timezone\` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
	\`captured_by_user_id\` int,
	\`device_id\` varchar(120),
	\`device_fingerprint\` varchar(120),
	\`geo_lat\` decimal(10,7),
	\`geo_lng\` decimal(10,7),
	\`geo_accuracy_m\` int,
	\`selfie_url\` varchar(500),
	\`integrity_status\` enum('valid','pending_verification','broken_chain','legacy_unverified') NOT NULL DEFAULT 'pending_verification',
	\`is_shadow_from_legacy\` boolean NOT NULL DEFAULT false,
	\`legacy_time_record_id\` int,
	\`metadata_json\` json,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	\`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`journey_punch_events_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jpe_employee_occurred_at\` ON \`journey_punch_events\` (\`employee_id\`,\`occurred_at\`);--> statement-breakpoint
CREATE INDEX \`idx_jpe_contract_occurred_at\` ON \`journey_punch_events\` (\`contract_id\`,\`occurred_at\`);--> statement-breakpoint
CREATE INDEX \`idx_jpe_legacy_shadow\` ON \`journey_punch_events\` (\`is_shadow_from_legacy\`,\`legacy_time_record_id\`);--> statement-breakpoint
CREATE INDEX \`idx_jpe_event_hash\` ON \`journey_punch_events\` (\`event_hash\`);--> statement-breakpoint
CREATE UNIQUE INDEX \`uq_jpe_nsr\` ON \`journey_punch_events\` (\`nsr\`);--> statement-breakpoint
CREATE TABLE \`journey_work_sessions\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`employee_id\` int NOT NULL,
	\`contract_id\` int,
	\`session_date\` date NOT NULL,
	\`started_at\` timestamp NOT NULL,
	\`ended_at\` timestamp,
	\`status\` enum('open','closed','inconsistent','superseded') NOT NULL DEFAULT 'open',
	\`first_event_id\` int,
	\`last_event_id\` int,
	\`client_id\` int,
	\`post_id\` int,
	\`generated_from_version\` varchar(40),
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	\`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`journey_work_sessions_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jws_employee_session_date\` ON \`journey_work_sessions\` (\`employee_id\`,\`session_date\`);--> statement-breakpoint
CREATE INDEX \`idx_jws_status\` ON \`journey_work_sessions\` (\`status\`);--> statement-breakpoint
CREATE INDEX \`idx_jws_started_at\` ON \`journey_work_sessions\` (\`started_at\`);--> statement-breakpoint
CREATE TABLE \`journey_work_segments\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`session_id\` int NOT NULL,
	\`employee_id\` int NOT NULL,
	\`segment_type\` enum('active_work','break','unknown_gap','manual_segment') NOT NULL,
	\`started_at\` timestamp NOT NULL,
	\`ended_at\` timestamp,
	\`minutes\` int,
	\`origin_start_event_id\` int,
	\`origin_end_event_id\` int,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`journey_work_segments_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jsg_session\` ON \`journey_work_segments\` (\`session_id\`);--> statement-breakpoint
CREATE INDEX \`idx_jsg_employee_started_at\` ON \`journey_work_segments\` (\`employee_id\`,\`started_at\`);--> statement-breakpoint
CREATE TABLE \`journey_evaluations\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`employee_id\` int NOT NULL,
	\`session_id\` int,
	\`evaluation_scope\` enum('session','day','period') NOT NULL,
	\`reference_date\` date NOT NULL,
	\`status\` enum('open','calculated','inconsistent','closed') NOT NULL DEFAULT 'open',
	\`expected_minutes\` int,
	\`worked_minutes\` int,
	\`delay_minutes\` int,
	\`overtime_50_minutes\` int NOT NULL DEFAULT 0,
	\`overtime_100_minutes\` int NOT NULL DEFAULT 0,
	\`night_minutes\` int NOT NULL DEFAULT 0,
	\`hour_bank_credit_minutes\` int NOT NULL DEFAULT 0,
	\`hour_bank_debit_minutes\` int NOT NULL DEFAULT 0,
	\`has_inconsistency\` boolean NOT NULL DEFAULT false,
	\`inconsistency_code\` varchar(80),
	\`computed_version\` varchar(40),
	\`computed_at\` timestamp,
	\`approved_state\` enum('pending','approved','rejected','superseded') NOT NULL DEFAULT 'pending',
	\`approved_by_user_id\` int,
	\`approved_at\` timestamp,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	\`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`journey_evaluations_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_je_employee_reference_date\` ON \`journey_evaluations\` (\`employee_id\`,\`reference_date\`);--> statement-breakpoint
CREATE INDEX \`idx_je_session\` ON \`journey_evaluations\` (\`session_id\`);--> statement-breakpoint
CREATE INDEX \`idx_je_approved_state\` ON \`journey_evaluations\` (\`approved_state\`);--> statement-breakpoint
CREATE TABLE \`journey_evaluation_versions\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`evaluation_id\` int NOT NULL,
	\`version_number\` int NOT NULL,
	\`engine_version\` varchar(40) NOT NULL,
	\`input_snapshot_json\` json,
	\`output_snapshot_json\` json,
	\`trigger_type\` enum('initial_compute','adjustment','policy_change','legacy_replay','manual_reprocess') NOT NULL,
	\`triggered_by_user_id\` int,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`journey_evaluation_versions_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`uq_jev_evaluation_version\` ON \`journey_evaluation_versions\` (\`evaluation_id\`,\`version_number\`);--> statement-breakpoint
CREATE INDEX \`idx_jev_evaluation\` ON \`journey_evaluation_versions\` (\`evaluation_id\`);--> statement-breakpoint
CREATE TABLE \`journey_adjustment_requests\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`employee_id\` int NOT NULL,
	\`session_id\` int,
	\`reference_date\` date NOT NULL,
	\`request_type\` enum('missing_clock_in','missing_break_start','missing_break_end','missing_clock_out','wrong_context','manual_correction') NOT NULL,
	\`requested_by_user_id\` int NOT NULL,
	\`justification\` text,
	\`status\` enum('open','under_review','approved','rejected','cancelled') NOT NULL DEFAULT 'open',
	\`requested_payload_json\` json,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	\`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`journey_adjustment_requests_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jar_employee_reference_date\` ON \`journey_adjustment_requests\` (\`employee_id\`,\`reference_date\`);--> statement-breakpoint
CREATE INDEX \`idx_jar_status\` ON \`journey_adjustment_requests\` (\`status\`);--> statement-breakpoint
CREATE INDEX \`idx_jar_requester\` ON \`journey_adjustment_requests\` (\`requested_by_user_id\`);--> statement-breakpoint
CREATE TABLE \`journey_adjustment_decisions\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`request_id\` int NOT NULL,
	\`decision\` enum('approve','reject','return_for_completion') NOT NULL,
	\`decided_by_user_id\` int NOT NULL,
	\`decision_notes\` text,
	\`applied_payload_json\` json,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`journey_adjustment_decisions_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jad_request\` ON \`journey_adjustment_decisions\` (\`request_id\`);--> statement-breakpoint
CREATE INDEX \`idx_jad_decider\` ON \`journey_adjustment_decisions\` (\`decided_by_user_id\`);--> statement-breakpoint
CREATE TABLE \`journey_receipts\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`employee_id\` int NOT NULL,
	\`event_id\` int,
	\`receipt_type\` enum('event_receipt','day_summary','period_statement') NOT NULL,
	\`payload_json\` json,
	\`pdf_url\` varchar(500),
	\`sha256\` varchar(64),
	\`generated_at\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`journey_receipts_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jr_employee_generated\` ON \`journey_receipts\` (\`employee_id\`,\`generated_at\`);--> statement-breakpoint
CREATE INDEX \`idx_jr_event\` ON \`journey_receipts\` (\`event_id\`);--> statement-breakpoint
CREATE TABLE \`journey_closures\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`employee_id\` int NOT NULL,
	\`period_start\` date NOT NULL,
	\`period_end\` date NOT NULL,
	\`status\` enum('open','under_review','closed','reopened') NOT NULL DEFAULT 'open',
	\`closed_by_user_id\` int,
	\`closed_at\` timestamp,
	\`reopened_by_user_id\` int,
	\`reopened_at\` timestamp,
	\`notes\` text,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	\`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`journey_closures_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jc_employee_period\` ON \`journey_closures\` (\`employee_id\`,\`period_start\`,\`period_end\`);--> statement-breakpoint
CREATE INDEX \`idx_jc_status\` ON \`journey_closures\` (\`status\`);--> statement-breakpoint
CREATE TABLE \`journey_audit_trail\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`entity_type\` enum('punch_event','work_session','evaluation','adjustment_request','closure') NOT NULL,
	\`entity_id\` int NOT NULL,
	\`action_type\` varchar(80) NOT NULL,
	\`actor_user_id\` int,
	\`payload_json\` json,
	\`created_at\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`journey_audit_trail_id\` PRIMARY KEY(\`id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_jat_entity\` ON \`journey_audit_trail\` (\`entity_type\`,\`entity_id\`);--> statement-breakpoint
CREATE INDEX \`idx_jat_actor\` ON \`journey_audit_trail\` (\`actor_user_id\`);
`;

const PILOT_POLICY_NAME = "Piloto CLT Padrão (4 batidas)";

export type JourneyPilotSetupResult = {
  tablesCreated: number;
  tablesExisting: number;
  journeyTables: number;
  policyId: number;
  policyExisted: boolean;
  assignmentsAdded: number;
  assignmentsTotal: number;
};

function rowsOf(result: unknown): any[] {
  // drizzle/mysql2 execute returns [rows, fields]
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  return (result as any[]) ?? [];
}

/**
 * Idempotent server-side setup for the Journey V2 pilot. Creates the journey
 * tables (if missing), a pilot CLT policy, and assigns every employee that can
 * be resolved from a user account (by userId link or matching email).
 * Runs on the app's own DB connection — no external credentials needed.
 */
export async function setupJourneyV2Pilot(): Promise<JourneyPilotSetupResult> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  // 1) Create tables/indexes (idempotent).
  const statements = JOURNEY_V2_DDL.split("--> statement-breakpoint")
    .map((seg) => seg.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim())
    .filter(Boolean);

  let tablesCreated = 0;
  let tablesExisting = 0;
  for (const st of statements) {
    try {
      await db.execute(sql.raw(st));
      tablesCreated++;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/already exists|Duplicate key name|exists/i.test(msg)) tablesExisting++;
      else throw new Error(`Falha ao criar estrutura do ponto v2: ${msg.slice(0, 160)}`);
    }
  }

  const journeyTables = rowsOf(await db.execute(sql`SHOW TABLES LIKE 'journey_%'`)).length;
  if (journeyTables < 12) {
    throw new Error(`Estrutura incompleta: apenas ${journeyTables} tabelas criadas.`);
  }

  // 2) Pilot policy (idempotent by unique name).
  await db.execute(sql`
    INSERT INTO journey_policies
      (name, operational_category, requires_time_tracking, break_mode, tolerance_minutes,
       default_start_time, default_end_time, default_break_minutes,
       evidence_policy_geo, evidence_policy_selfie, status)
    SELECT ${PILOT_POLICY_NAME}, 'clt_padrao', 1, 'explicit_break_required', 5,
           '08:00', '17:00', 60, 'optional', 'optional', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM journey_policies WHERE name = ${PILOT_POLICY_NAME})
  `);
  const policyRows = rowsOf(await db.execute(sql`SELECT id FROM journey_policies WHERE name = ${PILOT_POLICY_NAME} LIMIT 1`));
  const policyId = Number(policyRows[0]?.id);
  if (!policyId) throw new Error("Não foi possível criar/localizar a política do piloto.");
  const policyExisted = tablesExisting > 0 && tablesCreated === 0;

  // 3) Assign every employee resolvable from a user (by userId link or email).
  const before = rowsOf(await db.execute(sql`SELECT COUNT(*) AS n FROM journey_policy_assignments`));
  const totalBefore = Number(before[0]?.n ?? 0);

  await db.execute(sql`
    INSERT INTO journey_policy_assignments (employee_id, journey_policy_id, starts_on, priority)
    SELECT DISTINCT e.id, ${policyId}, CURDATE(), 100
    FROM users u
    JOIN employees e ON (e.userId = u.id OR e.email = u.email)
    WHERE NOT EXISTS (
      SELECT 1 FROM journey_policy_assignments a
      WHERE a.employee_id = e.id AND a.journey_policy_id = ${policyId}
    )
  `);

  const after = rowsOf(await db.execute(sql`SELECT COUNT(*) AS n FROM journey_policy_assignments`));
  const totalAfter = Number(after[0]?.n ?? 0);

  return {
    tablesCreated,
    tablesExisting,
    journeyTables,
    policyId,
    policyExisted,
    assignmentsAdded: totalAfter - totalBefore,
    assignmentsTotal: totalAfter,
  };
}
