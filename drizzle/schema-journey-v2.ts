import {
  boolean,
  date,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// ============================================================
// JOURNEY POLICIES (Policy master de jornada)
// ============================================================
export const journeyPolicies = mysqlTable(
  "journey_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    operationalCategory: mysqlEnum("operational_category", [
      "clt_padrao",
      "clt_alocado",
      "clt_multiposto",
      "intermitente_com_ponto_condicional",
      "sem_ponto",
    ]).notNull(),
    requiresTimeTracking: boolean("requires_time_tracking").default(true).notNull(),
    breakMode: mysqlEnum("break_mode", [
      "explicit_break_required",
      "explicit_break_optional",
      "auto_deduct_legacy_compat",
    ]).default("explicit_break_required").notNull(),
    scheduleType: varchar("schedule_type", { length: 40 }),
    defaultWorkDays: json("default_work_days"),
    defaultStartTime: varchar("default_start_time", { length: 5 }),
    defaultEndTime: varchar("default_end_time", { length: 5 }),
    defaultBreakMinutes: int("default_break_minutes"),
    toleranceMinutes: int("tolerance_minutes").default(5).notNull(),
    hourBankEnabled: boolean("hour_bank_enabled").default(false).notNull(),
    nightShiftEnabled: boolean("night_shift_enabled").default(false).notNull(),
    requiresContextBinding: boolean("requires_context_binding").default(false).notNull(),
    allowMultipleSessionsPerDay: boolean("allow_multiple_sessions_per_day").default(false).notNull(),
    allowCrossPostDay: boolean("allow_cross_post_day").default(false).notNull(),
    evidencePolicyGeo: mysqlEnum("evidence_policy_geo", ["disabled", "optional", "required"])
      .default("optional")
      .notNull(),
    evidencePolicySelfie: mysqlEnum("evidence_policy_selfie", ["disabled", "optional", "required"])
      .default("optional")
      .notNull(),
    evidencePolicyFingerprint: mysqlEnum("evidence_policy_fingerprint", ["disabled", "optional", "required"])
      .default("disabled")
      .notNull(),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    statusIdx: index("idx_jpol_status").on(table.status),
    categoryIdx: index("idx_jpol_category").on(table.operationalCategory),
    nameUnique: uniqueIndex("uq_jpol_name").on(table.name),
  }),
);

export type JourneyPolicy = typeof journeyPolicies.$inferSelect;
export type InsertJourneyPolicy = typeof journeyPolicies.$inferInsert;

// ============================================================
// JOURNEY POLICY ASSIGNMENTS (Policy por funcionario/contrato/contexto)
// ============================================================
export const journeyPolicyAssignments = mysqlTable(
  "journey_policy_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employee_id").notNull(),
    contractId: int("contract_id"),
    clientId: int("client_id"),
    postId: int("post_id"),
    journeyPolicyId: int("journey_policy_id").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }),
    priority: int("priority").default(100).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    employeeStartsIdx: index("idx_jpa_employee_starts").on(table.employeeId, table.startsOn),
    contractStartsIdx: index("idx_jpa_contract_starts").on(table.contractId, table.startsOn),
    policyIdx: index("idx_jpa_policy").on(table.journeyPolicyId),
  }),
);

export type JourneyPolicyAssignment = typeof journeyPolicyAssignments.$inferSelect;
export type InsertJourneyPolicyAssignment = typeof journeyPolicyAssignments.$inferInsert;

// ============================================================
// JOURNEY PUNCH EVENTS (Registro bruto por evento)
// ============================================================
export const journeyPunchEvents = mysqlTable(
  "journey_punch_events",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employee_id").notNull(),
    contractId: int("contract_id"),
    occurredAt: timestamp("occurred_at").notNull(),
    eventType: mysqlEnum("event_type", [
      "clock_in",
      "break_start",
      "break_end",
      "clock_out",
      "manual_adjustment",
      "imported_event",
      "system_correction",
    ]).notNull(),
    source: mysqlEnum("source", ["web", "mobile", "admin_manual", "legacy_shadow", "import", "api"])
      .notNull(),
    sourceReference: varchar("source_reference", { length: 120 }),
    clientId: int("client_id"),
    postId: int("post_id"),
    contextAssignmentRef: varchar("context_assignment_ref", { length: 120 }),
    nsr: int("nsr"),
    previousHash: varchar("previous_hash", { length: 64 }),
    eventHash: varchar("event_hash", { length: 64 }),
    timezone: varchar("timezone", { length: 64 }).default("America/Sao_Paulo").notNull(),
    capturedByUserId: int("captured_by_user_id"),
    deviceId: varchar("device_id", { length: 120 }),
    deviceFingerprint: varchar("device_fingerprint", { length: 120 }),
    geoLat: decimal("geo_lat", { precision: 10, scale: 7 }),
    geoLng: decimal("geo_lng", { precision: 10, scale: 7 }),
    geoAccuracyM: int("geo_accuracy_m"),
    selfieUrl: varchar("selfie_url", { length: 500 }),
    integrityStatus: mysqlEnum("integrity_status", [
      "valid",
      "pending_verification",
      "broken_chain",
      "legacy_unverified",
    ]).default("pending_verification").notNull(),
    isShadowFromLegacy: boolean("is_shadow_from_legacy").default(false).notNull(),
    legacyTimeRecordId: int("legacy_time_record_id"),
    metadataJson: json("metadata_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    employeeOccurredAtIdx: index("idx_jpe_employee_occurred_at").on(table.employeeId, table.occurredAt),
    contractOccurredAtIdx: index("idx_jpe_contract_occurred_at").on(table.contractId, table.occurredAt),
    shadowLegacyIdx: index("idx_jpe_legacy_shadow").on(table.isShadowFromLegacy, table.legacyTimeRecordId),
    eventHashIdx: index("idx_jpe_event_hash").on(table.eventHash),
    nsrUnique: uniqueIndex("uq_jpe_nsr").on(table.nsr),
  }),
);

export type JourneyPunchEvent = typeof journeyPunchEvents.$inferSelect;
export type InsertJourneyPunchEvent = typeof journeyPunchEvents.$inferInsert;

// ============================================================
// JOURNEY WORK SESSIONS (Sessao logica derivada)
// ============================================================
export const journeyWorkSessions = mysqlTable(
  "journey_work_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employee_id").notNull(),
    contractId: int("contract_id"),
    sessionDate: date("session_date", { mode: "string" }).notNull(),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    status: mysqlEnum("status", ["open", "closed", "inconsistent", "superseded"])
      .default("open")
      .notNull(),
    firstEventId: int("first_event_id"),
    lastEventId: int("last_event_id"),
    clientId: int("client_id"),
    postId: int("post_id"),
    generatedFromVersion: varchar("generated_from_version", { length: 40 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    employeeSessionDateIdx: index("idx_jws_employee_session_date").on(table.employeeId, table.sessionDate),
    statusIdx: index("idx_jws_status").on(table.status),
    startedAtIdx: index("idx_jws_started_at").on(table.startedAt),
  }),
);

export type JourneyWorkSession = typeof journeyWorkSessions.$inferSelect;
export type InsertJourneyWorkSession = typeof journeyWorkSessions.$inferInsert;

// ============================================================
// JOURNEY WORK SEGMENTS (Blocos interpretados da sessao)
// ============================================================
export const journeyWorkSegments = mysqlTable(
  "journey_work_segments",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("session_id").notNull(),
    employeeId: int("employee_id").notNull(),
    segmentType: mysqlEnum("segment_type", [
      "active_work",
      "break",
      "unknown_gap",
      "manual_segment",
    ]).notNull(),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    minutes: int("minutes"),
    originStartEventId: int("origin_start_event_id"),
    originEndEventId: int("origin_end_event_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("idx_jsg_session").on(table.sessionId),
    employeeStartedAtIdx: index("idx_jsg_employee_started_at").on(table.employeeId, table.startedAt),
  }),
);

export type JourneyWorkSegment = typeof journeyWorkSegments.$inferSelect;
export type InsertJourneyWorkSegment = typeof journeyWorkSegments.$inferInsert;

// ============================================================
// JOURNEY EVALUATIONS (Estado oficial calculado)
// ============================================================
export const journeyEvaluations = mysqlTable(
  "journey_evaluations",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employee_id").notNull(),
    sessionId: int("session_id"),
    evaluationScope: mysqlEnum("evaluation_scope", ["session", "day", "period"]).notNull(),
    referenceDate: date("reference_date", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ["open", "calculated", "inconsistent", "closed"])
      .default("open")
      .notNull(),
    expectedMinutes: int("expected_minutes"),
    workedMinutes: int("worked_minutes"),
    delayMinutes: int("delay_minutes"),
    overtime50Minutes: int("overtime_50_minutes").default(0).notNull(),
    overtime100Minutes: int("overtime_100_minutes").default(0).notNull(),
    nightMinutes: int("night_minutes").default(0).notNull(),
    hourBankCreditMinutes: int("hour_bank_credit_minutes").default(0).notNull(),
    hourBankDebitMinutes: int("hour_bank_debit_minutes").default(0).notNull(),
    hasInconsistency: boolean("has_inconsistency").default(false).notNull(),
    inconsistencyCode: varchar("inconsistency_code", { length: 80 }),
    computedVersion: varchar("computed_version", { length: 40 }),
    computedAt: timestamp("computed_at"),
    approvedState: mysqlEnum("approved_state", ["pending", "approved", "rejected", "superseded"])
      .default("pending")
      .notNull(),
    approvedByUserId: int("approved_by_user_id"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    employeeReferenceDateIdx: index("idx_je_employee_reference_date").on(table.employeeId, table.referenceDate),
    sessionIdx: index("idx_je_session").on(table.sessionId),
    approvedStateIdx: index("idx_je_approved_state").on(table.approvedState),
  }),
);

export type JourneyEvaluation = typeof journeyEvaluations.$inferSelect;
export type InsertJourneyEvaluation = typeof journeyEvaluations.$inferInsert;

// ============================================================
// JOURNEY EVALUATION VERSIONS (Reprocessamento/versionamento)
// ============================================================
export const journeyEvaluationVersions = mysqlTable(
  "journey_evaluation_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    evaluationId: int("evaluation_id").notNull(),
    versionNumber: int("version_number").notNull(),
    engineVersion: varchar("engine_version", { length: 40 }).notNull(),
    inputSnapshotJson: json("input_snapshot_json"),
    outputSnapshotJson: json("output_snapshot_json"),
    triggerType: mysqlEnum("trigger_type", [
      "initial_compute",
      "adjustment",
      "policy_change",
      "legacy_replay",
      "manual_reprocess",
    ]).notNull(),
    triggeredByUserId: int("triggered_by_user_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    evaluationVersionUnique: uniqueIndex("uq_jev_evaluation_version").on(table.evaluationId, table.versionNumber),
    evaluationIdx: index("idx_jev_evaluation").on(table.evaluationId),
  }),
);

export type JourneyEvaluationVersion = typeof journeyEvaluationVersions.$inferSelect;
export type InsertJourneyEvaluationVersion = typeof journeyEvaluationVersions.$inferInsert;

// ============================================================
// JOURNEY ADJUSTMENT REQUESTS (Solicitacoes formais)
// ============================================================
export const journeyAdjustmentRequests = mysqlTable(
  "journey_adjustment_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employee_id").notNull(),
    sessionId: int("session_id"),
    referenceDate: date("reference_date", { mode: "string" }).notNull(),
    requestType: mysqlEnum("request_type", [
      "missing_clock_in",
      "missing_break_start",
      "missing_break_end",
      "missing_clock_out",
      "wrong_context",
      "manual_correction",
    ]).notNull(),
    requestedByUserId: int("requested_by_user_id").notNull(),
    justification: text("justification"),
    status: mysqlEnum("status", ["open", "under_review", "approved", "rejected", "cancelled"])
      .default("open")
      .notNull(),
    requestedPayloadJson: json("requested_payload_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    employeeReferenceDateIdx: index("idx_jar_employee_reference_date").on(table.employeeId, table.referenceDate),
    statusIdx: index("idx_jar_status").on(table.status),
    requesterIdx: index("idx_jar_requester").on(table.requestedByUserId),
  }),
);

export type JourneyAdjustmentRequest = typeof journeyAdjustmentRequests.$inferSelect;
export type InsertJourneyAdjustmentRequest = typeof journeyAdjustmentRequests.$inferInsert;

// ============================================================
// JOURNEY ADJUSTMENT DECISIONS (Decisao formal)
// ============================================================
export const journeyAdjustmentDecisions = mysqlTable(
  "journey_adjustment_decisions",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("request_id").notNull(),
    decision: mysqlEnum("decision", ["approve", "reject", "return_for_completion"]).notNull(),
    decidedByUserId: int("decided_by_user_id").notNull(),
    decisionNotes: text("decision_notes"),
    appliedPayloadJson: json("applied_payload_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    requestIdx: index("idx_jad_request").on(table.requestId),
    deciderIdx: index("idx_jad_decider").on(table.decidedByUserId),
  }),
);

export type JourneyAdjustmentDecision = typeof journeyAdjustmentDecisions.$inferSelect;
export type InsertJourneyAdjustmentDecision = typeof journeyAdjustmentDecisions.$inferInsert;

// ============================================================
// JOURNEY RECEIPTS (Comprovantes persistidos)
// ============================================================
export const journeyReceipts = mysqlTable(
  "journey_receipts",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employee_id").notNull(),
    eventId: int("event_id"),
    receiptType: mysqlEnum("receipt_type", ["event_receipt", "day_summary", "period_statement"]).notNull(),
    payloadJson: json("payload_json"),
    pdfUrl: varchar("pdf_url", { length: 500 }),
    sha256: varchar("sha256", { length: 64 }),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
  },
  (table) => ({
    employeeGeneratedIdx: index("idx_jr_employee_generated").on(table.employeeId, table.generatedAt),
    eventIdx: index("idx_jr_event").on(table.eventId),
  }),
);

export type JourneyReceipt = typeof journeyReceipts.$inferSelect;
export type InsertJourneyReceipt = typeof journeyReceipts.$inferInsert;

// ============================================================
// JOURNEY CLOSURES (Fechamento de competencia)
// ============================================================
export const journeyClosures = mysqlTable(
  "journey_closures",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employee_id").notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ["open", "under_review", "closed", "reopened"]).default("open").notNull(),
    closedByUserId: int("closed_by_user_id"),
    closedAt: timestamp("closed_at"),
    reopenedByUserId: int("reopened_by_user_id"),
    reopenedAt: timestamp("reopened_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    employeePeriodIdx: index("idx_jc_employee_period").on(table.employeeId, table.periodStart, table.periodEnd),
    statusIdx: index("idx_jc_status").on(table.status),
  }),
);

export type JourneyClosure = typeof journeyClosures.$inferSelect;
export type InsertJourneyClosure = typeof journeyClosures.$inferInsert;

// ============================================================
// JOURNEY AUDIT TRAIL (Trilha auditavel transversal)
// ============================================================
export const journeyAuditTrail = mysqlTable(
  "journey_audit_trail",
  {
    id: int("id").autoincrement().primaryKey(),
    entityType: mysqlEnum("entity_type", [
      "punch_event",
      "work_session",
      "evaluation",
      "adjustment_request",
      "closure",
    ]).notNull(),
    entityId: int("entity_id").notNull(),
    actionType: varchar("action_type", { length: 80 }).notNull(),
    actorUserId: int("actor_user_id"),
    payloadJson: json("payload_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("idx_jat_entity").on(table.entityType, table.entityId),
    actorIdx: index("idx_jat_actor").on(table.actorUserId),
  }),
);

export type JourneyAuditEntry = typeof journeyAuditTrail.$inferSelect;
export type InsertJourneyAuditEntry = typeof journeyAuditTrail.$inferInsert;
