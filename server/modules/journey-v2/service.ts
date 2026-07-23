import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import {
  contracts,
  journeyAdjustmentDecisions,
  journeyAdjustmentRequests,
  journeyClosures,
  journeyEvaluations,
  journeyReceipts,
  employees,
  journeyPunchEvents,
  journeyPolicies,
  journeyPolicyAssignments,
  journeyWorkSessions,
} from "../../../drizzle/schema.js";
import { getDb, getEmployeeForUser } from "../../db.js";
import { computeRecordHash } from "../../utils/portaria-671.js";
import { evaluateClockRecord, getActiveScheduleRule, type ClockEvaluation } from "../../utils/journey-engine.js";
import {
  type JourneyEligibilityResult,
  type JourneyOperationalCategory,
  type JourneyPointRequirementMode,
  resolveJourneyEligibility,
} from "./eligibility.js";

export interface JourneyEligibilitySnapshot {
  employeeId: number;
  employeeStatus: string | null;
  contractId: number | null;
  contractActive: boolean;
  hasPolicy: boolean;
  operationalCategory: JourneyOperationalCategory;
  requiresTimeTracking: boolean;
  requiresContextBinding: boolean;
  hasActiveAssignmentContext: boolean;
  contextRequirementSatisfied: boolean;
  pointRequirementMode: JourneyPointRequirementMode;
  policyId: number | null;
  policyName: string | null;
  referenceDate: string;
}

export interface JourneyTodayStatus extends JourneyEligibilityResult {
  employeeId: number | null;
  contractId: number | null;
  policyId: number | null;
  policyName: string | null;
  referenceDate: string;
  linkedEmployee: boolean;
}

export interface RegisterJourneyPunchEventInput {
  eventType: "clock_in" | "break_start" | "break_end" | "clock_out";
  occurredAt?: Date;
  source?: "web" | "mobile" | "admin_manual" | "legacy_shadow" | "api";
  sourceReference?: string;
  deviceFingerprint?: string;
  location?: string;
  selfieUrl?: string;
}

export interface JourneyPunchTransitionResult {
  allowed: boolean;
  reasonCode: "ok" | "missing_clock_in" | "missing_break_start" | "missing_break_end" | "open_session_exists" | "break_already_open" | "unsupported_sequence";
}

export interface JourneyPunchEventListFilters {
  employeeId: number;
  startDate?: Date;
  endDate?: Date;
}

export interface JourneyTimelineBreak {
  startEventId: number;
  endEventId: number | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  status: "open" | "closed";
}

export interface JourneyTimelineSession {
  startEventId: number;
  endEventId: number | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  breakMinutes: number;
  workedMinutes: number | null;
  breaks: JourneyTimelineBreak[];
  currentBreak: JourneyTimelineBreak | null;
  status: "open" | "closed";
}

export interface JourneyDayTimeline {
  employeeId: number;
  referenceDate: string;
  sessions: JourneyTimelineSession[];
  openSession: JourneyTimelineSession | null;
  firstClockInAt: Date | null;
  lastClockOutAt: Date | null;
  totalBreakMinutes: number;
  totalWorkedMinutes: number;
}

export interface JourneyDayEvaluation {
  employeeId: number;
  referenceDate: string;
  timeline: JourneyDayTimeline;
  expectedMinutes: number;
  workedMinutes: number;
  delayMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  hourBankBalanceMinutes: number;
  status: "empty" | "open" | "closed" | "inconsistent";
  inconsistencyCode: string | null;
  notes: string[];
}

export interface JourneyPeriodSummary {
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  totalDays: number;
  evaluatedDays: number;
  openDays: number;
  inconsistentDays: number;
  closedDays: number;
  totalWorkedMinutes: number;
  totalExpectedMinutes: number;
  totalOvertimeMinutes: number;
  totalDelayMinutes: number;
  closable: boolean;
}

export interface CreateJourneyAdjustmentRequestInput {
  employeeId: number;
  requestedByUserId: number;
  referenceDate: string;
  requestType: "missing_clock_in" | "missing_break_start" | "missing_break_end" | "missing_clock_out" | "wrong_context" | "manual_correction";
  justification?: string;
  requestedPayloadJson?: Record<string, unknown> | null;
}

export interface DecideJourneyAdjustmentRequestInput {
  requestId: number;
  decidedByUserId: number;
  decision: "approve" | "reject" | "return_for_completion";
  decisionNotes?: string;
}

export interface JourneyAdjustmentEventPayload {
  eventType: "clock_in" | "break_start" | "break_end" | "clock_out";
  occurredAt: Date;
}

export interface JourneyEventReceiptPayload {
  eventId: number;
  employeeId: number;
  contractId: number | null;
  eventType: RegisterJourneyPunchEventInput["eventType"];
  occurredAt: string;
  nsr: number;
  eventHash: string;
  source: NonNullable<RegisterJourneyPunchEventInput["source"]>;
  sourceReference: string | null;
  location: string | null;
  selfieUrl: string | null;
  generatedAt: string;
}

function mapDayEvaluationStatusToRowStatus(status: JourneyDayEvaluation["status"]): "open" | "calculated" | "inconsistent" | "closed" {
  switch (status) {
    case "open":
      return "open";
    case "inconsistent":
      return "inconsistent";
    case "closed":
      return "closed";
    case "empty":
    default:
      return "calculated";
  }
}

function listDatesInRange(periodStart: string, periodEnd: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${periodStart}T00:00:00.000Z`);
  const end = new Date(`${periodEnd}T00:00:00.000Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function summarizeJourneyPeriodEvaluations(input: {
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  evaluations: Array<Pick<JourneyDayEvaluation, "status" | "workedMinutes" | "expectedMinutes" | "overtimeMinutes" | "delayMinutes">>;
}): JourneyPeriodSummary {
  const totalDays = listDatesInRange(input.periodStart, input.periodEnd).length;
  const openDays = input.evaluations.filter((item) => item.status === "open").length;
  const inconsistentDays = input.evaluations.filter((item) => item.status === "inconsistent").length;
  const closedDays = input.evaluations.filter((item) => item.status === "closed").length;

  return {
    employeeId: input.employeeId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    totalDays,
    evaluatedDays: input.evaluations.length,
    openDays,
    inconsistentDays,
    closedDays,
    totalWorkedMinutes: input.evaluations.reduce((sum, item) => sum + item.workedMinutes, 0),
    totalExpectedMinutes: input.evaluations.reduce((sum, item) => sum + item.expectedMinutes, 0),
    totalOvertimeMinutes: input.evaluations.reduce((sum, item) => sum + item.overtimeMinutes, 0),
    totalDelayMinutes: input.evaluations.reduce((sum, item) => sum + item.delayMinutes, 0),
    closable: openDays === 0 && inconsistentDays === 0,
  };
}

function parsePayloadDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveJourneyAdjustmentEventPayload(input: {
  requestType: CreateJourneyAdjustmentRequestInput["requestType"];
  payload?: Record<string, unknown> | null;
}): JourneyAdjustmentEventPayload | null {
  const payload = input.payload ?? {};

  if (input.requestType === "missing_clock_in") {
    const occurredAt = parsePayloadDate(payload.occurredAt);
    return occurredAt ? { eventType: "clock_in", occurredAt } : null;
  }

  if (input.requestType === "missing_clock_out") {
    const occurredAt = parsePayloadDate(payload.occurredAt);
    return occurredAt ? { eventType: "clock_out", occurredAt } : null;
  }

  if (input.requestType === "missing_break_start") {
    const occurredAt = parsePayloadDate(payload.occurredAt);
    return occurredAt ? { eventType: "break_start", occurredAt } : null;
  }

  if (input.requestType === "missing_break_end") {
    const occurredAt = parsePayloadDate(payload.occurredAt);
    return occurredAt ? { eventType: "break_end", occurredAt } : null;
  }

  if (input.requestType === "manual_correction") {
    const occurredAt = parsePayloadDate(payload.occurredAt);
    const eventType =
      payload.eventType === "clock_in"
      || payload.eventType === "break_start"
      || payload.eventType === "break_end"
      || payload.eventType === "clock_out"
      ? payload.eventType
      : null;
    return occurredAt && eventType ? { eventType, occurredAt } : null;
  }

  return null;
}

async function getJourneyClosureCoveringDate(employeeId: number, referenceDate: string) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(journeyClosures)
    .where(and(
      eq(journeyClosures.employeeId, employeeId),
      lte(journeyClosures.periodStart, referenceDate),
      gte(journeyClosures.periodEnd, referenceDate),
    ))
    .orderBy(desc(journeyClosures.periodEnd), desc(journeyClosures.id))
    .limit(1);

  return rows[0] ?? null;
}

async function assertJourneyDateEditable(employeeId: number, referenceDate: string) {
  const closure = await getJourneyClosureCoveringDate(employeeId, referenceDate);
  if (closure?.status === "closed") {
    throw new Error("O periodo desta data ja esta fechado no Journey V2. Reabra a competencia antes de alterar o ponto.");
  }
}

async function createJourneyEventReceipt(input: {
  employeeId: number;
  contractId: number | null;
  eventId: number;
  eventType: RegisterJourneyPunchEventInput["eventType"];
  occurredAt: Date;
  nsr: number;
  eventHash: string;
  source: NonNullable<RegisterJourneyPunchEventInput["source"]>;
  sourceReference?: string;
  location?: string;
  selfieUrl?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const payload: JourneyEventReceiptPayload = {
    eventId: input.eventId,
    employeeId: input.employeeId,
    contractId: input.contractId,
    eventType: input.eventType,
    occurredAt: input.occurredAt.toISOString(),
    nsr: input.nsr,
    eventHash: input.eventHash,
    source: input.source,
    sourceReference: input.sourceReference ?? null,
    location: input.location ?? null,
    selfieUrl: input.selfieUrl ?? null,
    generatedAt: new Date().toISOString(),
  };

  await db.insert(journeyReceipts).values({
    employeeId: input.employeeId,
    eventId: input.eventId,
    receiptType: "event_receipt",
    payloadJson: payload,
    sha256: input.eventHash,
  } as any);

  return payload;
}

function toDateOnly(input = new Date()): string {
  return input.toISOString().slice(0, 10);
}

function mapEventTypeToHashType(eventType: RegisterJourneyPunchEventInput["eventType"]): "IN" | "OUT" | "ADJ" {
  switch (eventType) {
    case "clock_in":
      return "IN";
    case "clock_out":
      return "OUT";
    default:
      return "ADJ";
  }
}

function eligibilityReasonMessage(reasonCode: JourneyTodayStatus["reasonCode"]): string {
  switch (reasonCode) {
    case "missing_policy":
      return "Sem politica de jornada configurada no Journey V2.";
    case "employee_not_active":
      return "O funcionario nao esta ativo para registrar ponto.";
    case "contract_not_active":
      return "Nao ha contrato ativo para registrar ponto nesta data.";
    case "time_tracking_not_required":
      return "Este colaborador nao precisa registrar ponto neste contexto.";
    case "missing_active_context":
      return "Falta contexto ativo para permitir a batida no Journey V2.";
    case "missing_required_context":
      return "A politica do Journey V2 exige contexto valido para a batida.";
    case "eligible":
    default:
      return "Elegibilidade indisponivel.";
  }
}

export function resolveJourneyPunchTransition(
  lastEventType: string | null | undefined,
  nextEventType: RegisterJourneyPunchEventInput["eventType"],
): JourneyPunchTransitionResult {
  if (!lastEventType) {
    return nextEventType === "clock_in"
      ? { allowed: true, reasonCode: "ok" }
      : { allowed: false, reasonCode: "missing_clock_in" };
  }

  if (lastEventType === "clock_in") {
    if (nextEventType === "break_start" || nextEventType === "clock_out") {
      return { allowed: true, reasonCode: "ok" };
    }
    return { allowed: false, reasonCode: "open_session_exists" };
  }

  if (lastEventType === "break_start") {
    return nextEventType === "break_end"
      ? { allowed: true, reasonCode: "ok" }
      : { allowed: false, reasonCode: "missing_break_end" };
  }

  if (lastEventType === "break_end") {
    if (nextEventType === "break_start" || nextEventType === "clock_out") {
      return { allowed: true, reasonCode: "ok" };
    }
    return { allowed: false, reasonCode: "missing_break_start" };
  }

  if (lastEventType === "clock_out") {
    return nextEventType === "clock_in"
      ? { allowed: true, reasonCode: "ok" }
      : { allowed: false, reasonCode: "missing_clock_in" };
  }

  return { allowed: false, reasonCode: "unsupported_sequence" };
}

export function buildJourneyDayTimeline(
  employeeId: number,
  referenceDate: string,
  rawEvents: Array<{
    id: number;
    eventType: string;
    occurredAt: Date | string;
  }>,
): JourneyDayTimeline {
  const events = [...rawEvents]
    .map((event) => ({
      ...event,
      occurredAt: event.occurredAt instanceof Date ? event.occurredAt : new Date(event.occurredAt),
    }))
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id - b.id);

  const sessions: JourneyTimelineSession[] = [];
  let openSessionState: {
    startEventId: number;
    startedAt: Date;
    breaks: JourneyTimelineBreak[];
    currentBreak: JourneyTimelineBreak | null;
  } | null = null;

  for (const event of events) {
    if (event.eventType === "clock_in") {
      if (!openSessionState) {
        openSessionState = {
          startEventId: event.id,
          startedAt: event.occurredAt,
          breaks: [],
          currentBreak: null,
        };
      }
      continue;
    }

    if (event.eventType === "break_start" && openSessionState && !openSessionState.currentBreak) {
      openSessionState.currentBreak = {
        startEventId: event.id,
        endEventId: null,
        startedAt: event.occurredAt,
        endedAt: null,
        durationMinutes: null,
        status: "open",
      };
      continue;
    }

    if (event.eventType === "break_end" && openSessionState?.currentBreak) {
      const currentBreak = openSessionState.currentBreak;
      openSessionState.breaks.push({
        ...currentBreak,
        endEventId: event.id,
        endedAt: event.occurredAt,
        durationMinutes: Math.max(
          0,
          Math.round((event.occurredAt.getTime() - currentBreak.startedAt.getTime()) / 60000),
        ),
        status: "closed",
      });
      openSessionState.currentBreak = null;
      continue;
    }

    if (event.eventType === "clock_out" && openSessionState && !openSessionState.currentBreak) {
      const durationMinutes = Math.max(
        0,
        Math.round((event.occurredAt.getTime() - openSessionState.startedAt.getTime()) / 60000),
      );
      const breakMinutes = openSessionState.breaks.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0);
      sessions.push({
        startEventId: openSessionState.startEventId,
        endEventId: event.id,
        startedAt: openSessionState.startedAt,
        endedAt: event.occurredAt,
        durationMinutes,
        breakMinutes,
        workedMinutes: Math.max(0, durationMinutes - breakMinutes),
        breaks: openSessionState.breaks,
        currentBreak: null,
        status: "closed",
      });
      openSessionState = null;
    }
  }

  const openSession = openSessionState
    ? {
        startEventId: openSessionState.startEventId,
        endEventId: null,
        startedAt: openSessionState.startedAt,
        endedAt: null,
        durationMinutes: null,
        breakMinutes: openSessionState.breaks.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0),
        workedMinutes: null,
        breaks: openSessionState.breaks,
        currentBreak: openSessionState.currentBreak,
        status: "open" as const,
      }
    : null;

  const firstClockInAt = events.find((event) => event.eventType === "clock_in")?.occurredAt ?? null;
  const lastClockOutAt = [...events].reverse().find((event) => event.eventType === "clock_out")?.occurredAt ?? null;
  const totalBreakMinutes = sessions.reduce((sum, session) => sum + session.breakMinutes, 0);
  const totalWorkedMinutes = sessions.reduce((sum, session) => sum + (session.workedMinutes ?? 0), 0);

  return {
    employeeId,
    referenceDate,
    sessions,
    openSession,
    firstClockInAt,
    lastClockOutAt,
    totalBreakMinutes,
    totalWorkedMinutes,
  };
}

function isContractActiveAtDate(
  contract: { hireDate: string | Date | null; terminationDate: string | Date | null } | null | undefined,
  referenceDate: string,
): boolean {
  if (!contract?.hireDate) return false;

  const hireDate = typeof contract.hireDate === "string"
    ? contract.hireDate
    : contract.hireDate.toISOString().slice(0, 10);
  const terminationDate = contract.terminationDate
    ? typeof contract.terminationDate === "string"
      ? contract.terminationDate
      : contract.terminationDate.toISOString().slice(0, 10)
    : null;

  return hireDate <= referenceDate && (!terminationDate || terminationDate >= referenceDate);
}

export function resolveJourneyTodayStatusFromSnapshot(
  snapshot: JourneyEligibilitySnapshot | null,
): JourneyTodayStatus {
  if (!snapshot) {
    return {
      employeeId: null,
      contractId: null,
      policyId: null,
      policyName: null,
      referenceDate: toDateOnly(),
      linkedEmployee: false,
      isEligibleForTimeTracking: false,
      canRegisterPunch: false,
      reasonCode: "missing_policy",
    };
  }

  const eligibility = resolveJourneyEligibility({
    employeeStatus: snapshot.employeeStatus,
    contractActive: snapshot.contractActive,
    hasPolicy: snapshot.hasPolicy,
    operationalCategory: snapshot.operationalCategory,
    requiresTimeTracking: snapshot.requiresTimeTracking,
    requiresContextBinding: snapshot.requiresContextBinding,
    hasActiveAssignmentContext: snapshot.hasActiveAssignmentContext,
    contextRequirementSatisfied: snapshot.contextRequirementSatisfied,
    pointRequirementMode: snapshot.pointRequirementMode,
  });

  return {
    employeeId: snapshot.employeeId,
    contractId: snapshot.contractId,
    policyId: snapshot.policyId,
    policyName: snapshot.policyName,
    referenceDate: snapshot.referenceDate,
    linkedEmployee: true,
    ...eligibility,
  };
}

export async function loadJourneyEligibilitySnapshotForUser(
  userId: number,
  userEmail?: string,
  referenceDate = toDateOnly(),
): Promise<JourneyEligibilitySnapshot | null> {
  const db = await getDb();
  if (!db) return null;

  const employee = await getEmployeeForUser(userId, userEmail);
  if (!employee) return null;
  return loadJourneyEligibilitySnapshotForEmployee(employee.id, referenceDate);
}

export async function loadJourneyEligibilitySnapshotForEmployee(
  employeeId: number,
  referenceDate = toDateOnly(),
): Promise<JourneyEligibilitySnapshot | null> {
  const db = await getDb();
  if (!db) return null;

  const employeeRows = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  const employee = employeeRows[0];
  if (!employee) return null;

  const employeeContracts = await db
    .select()
    .from(contracts)
    .where(eq(contracts.employeeId, employee.id))
    .orderBy(desc(contracts.hireDate), desc(contracts.id));

  const activeContract = employeeContracts.find((contract) =>
    isContractActiveAtDate(contract as any, referenceDate),
  ) ?? null;

  const assignments = await db
    .select({
      assignmentId: journeyPolicyAssignments.id,
      employeeId: journeyPolicyAssignments.employeeId,
      contractId: journeyPolicyAssignments.contractId,
      clientId: journeyPolicyAssignments.clientId,
      postId: journeyPolicyAssignments.postId,
      startsOn: journeyPolicyAssignments.startsOn,
      endsOn: journeyPolicyAssignments.endsOn,
      priority: journeyPolicyAssignments.priority,
      policyId: journeyPolicies.id,
      policyName: journeyPolicies.name,
      operationalCategory: journeyPolicies.operationalCategory,
      requiresTimeTracking: journeyPolicies.requiresTimeTracking,
      requiresContextBinding: journeyPolicies.requiresContextBinding,
      status: journeyPolicies.status,
    })
    .from(journeyPolicyAssignments)
    .innerJoin(journeyPolicies, eq(journeyPolicyAssignments.journeyPolicyId, journeyPolicies.id))
    .where(and(
      eq(journeyPolicyAssignments.employeeId, employee.id),
      lte(journeyPolicyAssignments.startsOn, referenceDate),
      or(
        gte(journeyPolicyAssignments.endsOn, referenceDate),
        eq(journeyPolicyAssignments.endsOn, null as any),
      ),
      eq(journeyPolicies.status, "active"),
    ))
    .orderBy(
      desc(journeyPolicyAssignments.priority),
      desc(journeyPolicyAssignments.contractId),
      desc(journeyPolicyAssignments.clientId),
      desc(journeyPolicyAssignments.postId),
      desc(journeyPolicyAssignments.id),
    );

  const applicableAssignment = assignments.find((assignment) => {
    if (!activeContract) return assignment.contractId == null;
    return assignment.contractId == null || assignment.contractId === activeContract.id;
  }) ?? null;

  const operationalCategory = (applicableAssignment?.operationalCategory ?? "sem_ponto") as JourneyOperationalCategory;
  const requiresTimeTracking = Boolean(applicableAssignment?.requiresTimeTracking);
  const requiresContextBinding = Boolean(applicableAssignment?.requiresContextBinding);
  const hasActiveAssignmentContext = Boolean(applicableAssignment && (
    applicableAssignment.clientId != null
    || applicableAssignment.postId != null
    || applicableAssignment.contractId != null
  ));

  let pointRequirementMode: JourneyPointRequirementMode = "always";
  if (operationalCategory === "sem_ponto" || !requiresTimeTracking) {
    pointRequirementMode = "never";
  } else if (operationalCategory === "intermitente_com_ponto_condicional") {
    pointRequirementMode = "conditional_by_context";
  }

  return {
    employeeId: employee.id,
    employeeStatus: employee.status ?? null,
    contractId: activeContract?.id ?? null,
    contractActive: Boolean(activeContract),
    hasPolicy: Boolean(applicableAssignment),
    operationalCategory,
    requiresTimeTracking,
    requiresContextBinding,
    hasActiveAssignmentContext,
    contextRequirementSatisfied: !requiresContextBinding || hasActiveAssignmentContext,
    pointRequirementMode,
    policyId: applicableAssignment?.policyId ?? null,
    policyName: applicableAssignment?.policyName ?? null,
    referenceDate,
  };
}

export async function getJourneyTodayStatusForUser(
  userId: number,
  userEmail?: string,
  referenceDate = toDateOnly(),
): Promise<JourneyTodayStatus> {
  const snapshot = await loadJourneyEligibilitySnapshotForUser(userId, userEmail, referenceDate);
  const status = resolveJourneyTodayStatusFromSnapshot(snapshot);
  if (snapshot) return status;

  return {
    ...status,
    referenceDate,
  };
}

export async function getLatestJourneyPunchEventForEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(journeyPunchEvents)
    .where(eq(journeyPunchEvents.employeeId, employeeId))
    .orderBy(desc(journeyPunchEvents.occurredAt), desc(journeyPunchEvents.id))
    .limit(1);

  return rows[0] ?? null;
}

async function getNextJourneyNsr(): Promise<number> {
  const db = await getDb();
  if (!db) return 1;

  const rows = await db
    .select({ max: sql<number>`COALESCE(MAX(${journeyPunchEvents.nsr}), 0)` })
    .from(journeyPunchEvents);

  return Number(rows[0]?.max ?? 0) + 1;
}

async function getLastJourneyEventHash(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({ hash: journeyPunchEvents.eventHash })
    .from(journeyPunchEvents)
    .where(sql`${journeyPunchEvents.eventHash} IS NOT NULL`)
    .orderBy(desc(journeyPunchEvents.nsr))
    .limit(1);

  return rows[0]?.hash ?? null;
}

export async function registerJourneyPunchEventForUser(
  userId: number,
  userEmail: string | undefined,
  input: RegisterJourneyPunchEventInput,
) {
  const employee = await getEmployeeForUser(userId, userEmail);
  if (!employee) {
    throw new Error("Funcionario nao encontrado para registrar evento no Journey V2.");
  }

  return registerJourneyPunchEventForEmployeeId(employee.id, input);
}

export async function registerJourneyPunchEventForEmployeeId(
  employeeId: number,
  input: RegisterJourneyPunchEventInput,
) {
  const db = await getDb();
  if (!db) {
    throw new Error("DB not available");
  }

  const occurredAt = input.occurredAt ?? new Date();
  const referenceDate = toDateOnly(occurredAt);
  await assertJourneyDateEditable(employeeId, referenceDate);
  const snapshot = await loadJourneyEligibilitySnapshotForEmployee(employeeId, referenceDate);
  const status = resolveJourneyTodayStatusFromSnapshot(snapshot);

  if (!status.linkedEmployee || !snapshot?.employeeId) {
    throw new Error("Nenhum funcionario vinculado ao registro do Journey V2.");
  }

  if (!status.canRegisterPunch) {
    throw new Error(eligibilityReasonMessage(status.reasonCode));
  }

  const employeeRows = await db
    .select({ id: employees.id, cpf: employees.cpf })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  const employee = employeeRows[0];
  if (!employee) {
    throw new Error("Funcionario nao encontrado para registrar evento no Journey V2.");
  }

  const lastEvent = await getLatestJourneyPunchEventForEmployee(snapshot.employeeId);
  const transition = resolveJourneyPunchTransition(lastEvent?.eventType, input.eventType);
  if (!transition.allowed) {
    switch (transition.reasonCode) {
      case "missing_clock_in":
        throw new Error("Nao e possivel registrar saida sem uma entrada anterior no Journey V2.");
      case "missing_break_start":
        throw new Error("Nao e possivel voltar do intervalo sem registrar o inicio do intervalo no Journey V2.");
      case "missing_break_end":
        throw new Error("Finalize o intervalo antes de registrar uma nova acao no Journey V2.");
      case "open_session_exists":
        throw new Error("Ja existe uma jornada aberta no Journey V2. Registre a saida antes de nova entrada.");
      default:
        throw new Error("Sequencia de eventos nao suportada no Journey V2.");
    }
  }

  const nsr = await getNextJourneyNsr();
  const previousHash = await getLastJourneyEventHash();
  const eventHash = computeRecordHash({
    previousHash,
    nsr,
    employeeCpf: employee.cpf ?? "00000000000",
    clockTimestampISO: occurredAt.toISOString(),
    type: mapEventTypeToHashType(input.eventType),
  });

  const result = await db.insert(journeyPunchEvents).values({
    employeeId: snapshot.employeeId,
    contractId: snapshot.contractId,
    occurredAt,
    eventType: input.eventType,
    source: input.source ?? "web",
    sourceReference: input.sourceReference,
    nsr,
    previousHash,
    eventHash,
    timezone: "America/Sao_Paulo",
    deviceFingerprint: input.deviceFingerprint,
    selfieUrl: input.selfieUrl,
    integrityStatus: "valid",
    metadataJson: input.location ? { location: input.location } : null,
  } as any);
  const eventId = Number(result[0]?.insertId ?? 0) || 0;

  if (eventId > 0) {
    await createJourneyEventReceipt({
      employeeId: snapshot.employeeId,
      contractId: snapshot.contractId,
      eventId,
      eventType: input.eventType,
      occurredAt,
      nsr,
      eventHash,
      source: input.source ?? "web",
      sourceReference: input.sourceReference,
      location: input.location,
      selfieUrl: input.selfieUrl,
    });
  }

  try {
    await syncJourneyDayArtifacts(snapshot.employeeId, referenceDate);
  } catch (error) {
    console.warn("[JourneyV2] Failed to sync derived day artifacts after event registration:", {
      employeeId: snapshot.employeeId,
      referenceDate,
      eventType: input.eventType,
      error: error instanceof Error ? error.message : error,
    });
  }

  return {
    success: true,
    id: eventId || result[0]?.insertId,
    employeeId: snapshot.employeeId,
    contractId: snapshot.contractId,
    eventType: input.eventType,
    occurredAt,
    nsr,
    eventHash,
  };
}

export async function listJourneyPunchEvents(filters: JourneyPunchEventListFilters) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(journeyPunchEvents.employeeId, filters.employeeId)];
  if (filters.startDate) {
    conditions.push(gte(journeyPunchEvents.occurredAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(journeyPunchEvents.occurredAt, filters.endDate));
  }

  return db
    .select()
    .from(journeyPunchEvents)
    .where(and(...conditions))
    .orderBy(desc(journeyPunchEvents.occurredAt), desc(journeyPunchEvents.id));
}

export async function getJourneyDayTimeline(
  employeeId: number,
  referenceDate: string,
): Promise<JourneyDayTimeline> {
  const startDate = new Date(`${referenceDate}T00:00:00.000Z`);
  const endDate = new Date(`${referenceDate}T23:59:59.999Z`);
  const events = await listJourneyPunchEvents({
    employeeId,
    startDate,
    endDate,
  });

  return buildJourneyDayTimeline(employeeId, referenceDate, events as any);
}

function emptyJourneyDayEvaluation(
  employeeId: number,
  referenceDate: string,
  timeline: JourneyDayTimeline,
  overrides?: Partial<JourneyDayEvaluation>,
): JourneyDayEvaluation {
  return {
    employeeId,
    referenceDate,
    timeline,
    expectedMinutes: 0,
    workedMinutes: timeline.totalWorkedMinutes,
    delayMinutes: 0,
    overtimeMinutes: 0,
    nightMinutes: 0,
    hourBankBalanceMinutes: 0,
    status: "empty",
    inconsistencyCode: null,
    notes: [],
    ...overrides,
  };
}

export async function getJourneyDayEvaluation(
  employeeId: number,
  referenceDate: string,
): Promise<JourneyDayEvaluation> {
  const timeline = await getJourneyDayTimeline(employeeId, referenceDate);

  if (timeline.sessions.length === 0 && !timeline.openSession) {
    return emptyJourneyDayEvaluation(employeeId, referenceDate, timeline, {
      status: "empty",
      notes: ["Nenhuma sessao V2 encontrada para a data."],
    });
  }

  if (timeline.openSession) {
    return emptyJourneyDayEvaluation(employeeId, referenceDate, timeline, {
      status: "open",
      inconsistencyCode: "open_session",
      notes: ["Existe sessao aberta sem clock_out no Journey V2."],
    });
  }

  const rule = await getActiveScheduleRule(employeeId);
  if (!rule) {
    return emptyJourneyDayEvaluation(employeeId, referenceDate, timeline, {
      status: "inconsistent",
      inconsistencyCode: "missing_schedule_rule",
      notes: ["Nao foi encontrada regra ativa de jornada para o colaborador."],
    });
  }

  let aggregated: ClockEvaluation | null = null;
  for (const session of timeline.sessions) {
    if (!session.endedAt) continue;
    const evaluation = await evaluateClockRecord({
      clockIn: session.startedAt,
      clockOut: session.endedAt,
      rule,
      unpaidBreakMinutes: session.breakMinutes,
    });

    if (!aggregated) {
      aggregated = {
        ...evaluation,
        notes: [...evaluation.notes],
      };
      continue;
    }

    aggregated = {
      expectedMinutes: aggregated.expectedMinutes + evaluation.expectedMinutes,
      workedMinutes: aggregated.workedMinutes + evaluation.workedMinutes,
      delayMinutes: aggregated.delayMinutes + evaluation.delayMinutes,
      isWorkday: aggregated.isWorkday || evaluation.isWorkday,
      isHoliday: aggregated.isHoliday || evaluation.isHoliday,
      isWeekend: aggregated.isWeekend || evaluation.isWeekend,
      overtime: {
        type50: aggregated.overtime.type50 + evaluation.overtime.type50,
        type100: aggregated.overtime.type100 + evaluation.overtime.type100,
        typeNight: aggregated.overtime.typeNight + evaluation.overtime.typeNight,
        total: aggregated.overtime.total + evaluation.overtime.total,
      },
      hourBank: {
        credit: aggregated.hourBank.credit + evaluation.hourBank.credit,
        debit: aggregated.hourBank.debit + evaluation.hourBank.debit,
      },
      notes: [...aggregated.notes, ...evaluation.notes],
    };
  }

  if (!aggregated) {
    return emptyJourneyDayEvaluation(employeeId, referenceDate, timeline, {
      status: "inconsistent",
      inconsistencyCode: "no_closed_session",
      notes: ["Nao foi possivel avaliar nenhuma sessao fechada no Journey V2."],
    });
  }

  return {
    employeeId,
    referenceDate,
    timeline,
    expectedMinutes: aggregated.expectedMinutes,
    workedMinutes: aggregated.workedMinutes,
    delayMinutes: aggregated.delayMinutes,
    overtimeMinutes: aggregated.overtime.total,
    nightMinutes: aggregated.overtime.typeNight,
    hourBankBalanceMinutes: aggregated.hourBank.credit - aggregated.hourBank.debit,
    status: "closed",
    inconsistencyCode: null,
    notes: aggregated.notes,
  };
}

export async function syncJourneyDayArtifacts(
  employeeId: number,
  referenceDate: string,
): Promise<JourneyDayEvaluation> {
  const db = await getDb();
  if (!db) {
    throw new Error("DB not available");
  }

  const evaluation = await getJourneyDayEvaluation(employeeId, referenceDate);

  await db
    .delete(journeyEvaluations)
    .where(and(
      eq(journeyEvaluations.employeeId, employeeId),
      eq(journeyEvaluations.referenceDate, referenceDate),
      eq(journeyEvaluations.evaluationScope, "day"),
    ));

  await db
    .delete(journeyWorkSessions)
    .where(and(
      eq(journeyWorkSessions.employeeId, employeeId),
      eq(journeyWorkSessions.sessionDate, referenceDate),
    ));

  for (const session of evaluation.timeline.sessions) {
    await db.insert(journeyWorkSessions).values({
      employeeId,
      contractId: null,
      sessionDate: referenceDate,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      status: session.status === "closed" ? "closed" : "open",
      firstEventId: session.startEventId,
      lastEventId: session.endEventId,
      generatedFromVersion: "timeline-v1",
    } as any);
  }

  if (evaluation.timeline.openSession) {
    const session = evaluation.timeline.openSession;
    await db.insert(journeyWorkSessions).values({
      employeeId,
      contractId: null,
      sessionDate: referenceDate,
      startedAt: session.startedAt,
      endedAt: null,
      status: "open",
      firstEventId: session.startEventId,
      lastEventId: null,
      generatedFromVersion: "timeline-v1",
    } as any);
  }

  await db.insert(journeyEvaluations).values({
    employeeId,
    sessionId: null,
    evaluationScope: "day",
    referenceDate,
    status: mapDayEvaluationStatusToRowStatus(evaluation.status),
    expectedMinutes: evaluation.expectedMinutes,
    workedMinutes: evaluation.workedMinutes,
    delayMinutes: evaluation.delayMinutes,
    overtime50Minutes: evaluation.overtimeMinutes,
    overtime100Minutes: 0,
    nightMinutes: evaluation.nightMinutes,
    hourBankCreditMinutes: Math.max(0, evaluation.hourBankBalanceMinutes),
    hourBankDebitMinutes: Math.max(0, -evaluation.hourBankBalanceMinutes),
    hasInconsistency: evaluation.status === "open" || evaluation.status === "inconsistent",
    inconsistencyCode: evaluation.inconsistencyCode,
    computedVersion: "day-evaluation-v1",
    computedAt: new Date(),
    approvedState: "pending",
  } as any);

  return evaluation;
}

export async function createJourneyAdjustmentRequest(
  input: CreateJourneyAdjustmentRequestInput,
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await assertJourneyDateEditable(input.employeeId, input.referenceDate);

  const result = await db.insert(journeyAdjustmentRequests).values({
    employeeId: input.employeeId,
    sessionId: null,
    referenceDate: input.referenceDate,
    requestType: input.requestType,
    requestedByUserId: input.requestedByUserId,
    justification: input.justification,
    status: "open",
    requestedPayloadJson: input.requestedPayloadJson ?? null,
  } as any);

  return {
    success: true,
    id: result[0]?.insertId,
  };
}

export async function listJourneyAdjustmentRequests(filters: {
  employeeId?: number;
  employeeIds?: number[];
  status?: "open" | "under_review" | "approved" | "rejected" | "cancelled";
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (filters.employeeId) {
    conditions.push(eq(journeyAdjustmentRequests.employeeId, filters.employeeId));
  }
  if (filters.employeeIds && filters.employeeIds.length > 0) {
    conditions.push(sql`${journeyAdjustmentRequests.employeeId} IN (${sql.join(filters.employeeIds.map((id) => sql`${id}`), sql`, `)})`);
  }
  if (filters.status) {
    conditions.push(eq(journeyAdjustmentRequests.status, filters.status));
  }

  const query = db
    .select()
    .from(journeyAdjustmentRequests)
    .orderBy(desc(journeyAdjustmentRequests.createdAt), desc(journeyAdjustmentRequests.id));

  if (conditions.length === 0) {
    return query;
  }

  return query.where(and(...conditions));
}

export async function getJourneyAdjustmentRequest(requestId: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(journeyAdjustmentRequests)
    .where(eq(journeyAdjustmentRequests.id, requestId))
    .limit(1);

  return rows[0] ?? null;
}

export async function getLatestJourneyReceipt(employeeId: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(journeyReceipts)
    .where(eq(journeyReceipts.employeeId, employeeId))
    .orderBy(desc(journeyReceipts.generatedAt), desc(journeyReceipts.id))
    .limit(1);

  return rows[0] ?? null;
}

export async function decideJourneyAdjustmentRequest(
  input: DecideJourneyAdjustmentRequestInput,
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const request = await getJourneyAdjustmentRequest(input.requestId);
  if (!request) {
    throw new Error("Solicitacao de ajuste V2 nao encontrada.");
  }

  if (request.status !== "open" && request.status !== "under_review") {
    throw new Error("Esta solicitacao de ajuste V2 ja foi decidida.");
  }

  const payload = (request.requestedPayloadJson ?? null) as Record<string, unknown> | null;
  const derivedEvent = input.decision === "approve"
    ? resolveJourneyAdjustmentEventPayload({
        requestType: request.requestType as any,
        payload,
      })
    : null;

  await db.insert(journeyAdjustmentDecisions).values({
    requestId: request.id,
    decision: input.decision,
    decidedByUserId: input.decidedByUserId,
    decisionNotes: input.decisionNotes,
    appliedPayloadJson: derivedEvent
      ? {
          eventType: derivedEvent.eventType,
          occurredAt: derivedEvent.occurredAt.toISOString(),
        }
      : null,
  } as any);

  await db
    .update(journeyAdjustmentRequests)
    .set({
      status: input.decision === "approve"
        ? "approved"
        : input.decision === "reject"
          ? "rejected"
          : "under_review",
      updatedAt: new Date(),
    } as any)
    .where(eq(journeyAdjustmentRequests.id, request.id));

  let appliedEventId: number | null = null;
  if (input.decision === "approve" && derivedEvent) {
    const eventResult = await registerJourneyPunchEventForEmployeeId(request.employeeId, {
      eventType: derivedEvent.eventType,
      occurredAt: derivedEvent.occurredAt,
      source: "admin_manual",
      sourceReference: `journey_adjustment_request:${request.id}`,
    });
    appliedEventId = Number(eventResult.id ?? 0) || null;
  } else {
    await syncJourneyDayArtifacts(request.employeeId, request.referenceDate);
  }

  return {
    success: true,
    requestId: request.id,
    appliedEventId,
  };
}

export async function getJourneyPeriodSummary(
  employeeId: number,
  periodStart: string,
  periodEnd: string,
): Promise<JourneyPeriodSummary> {
  const dates = listDatesInRange(periodStart, periodEnd);
  const evaluations: JourneyDayEvaluation[] = [];
  for (const referenceDate of dates) {
    evaluations.push(await getJourneyDayEvaluation(employeeId, referenceDate));
  }

  return summarizeJourneyPeriodEvaluations({
    employeeId,
    periodStart,
    periodEnd,
    evaluations,
  });
}

export async function listJourneyClosures(filters: {
  employeeId?: number;
  employeeIds?: number[];
  status?: "open" | "under_review" | "closed" | "reopened";
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (filters.employeeId) conditions.push(eq(journeyClosures.employeeId, filters.employeeId));
  if (filters.employeeIds && filters.employeeIds.length > 0) {
    conditions.push(sql`${journeyClosures.employeeId} IN (${sql.join(filters.employeeIds.map((id) => sql`${id}`), sql`, `)})`);
  }
  if (filters.status) conditions.push(eq(journeyClosures.status, filters.status));

  const query = db
    .select()
    .from(journeyClosures)
    .orderBy(desc(journeyClosures.periodStart), desc(journeyClosures.id));

  return conditions.length > 0 ? query.where(and(...conditions)) : query;
}

export async function closeJourneyPeriod(input: {
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  closedByUserId: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const dates = listDatesInRange(input.periodStart, input.periodEnd);
  for (const referenceDate of dates) {
    await syncJourneyDayArtifacts(input.employeeId, referenceDate);
  }

  const summary = await getJourneyPeriodSummary(input.employeeId, input.periodStart, input.periodEnd);
  const existing = (await db
    .select()
    .from(journeyClosures)
    .where(and(
      eq(journeyClosures.employeeId, input.employeeId),
      eq(journeyClosures.periodStart, input.periodStart),
      eq(journeyClosures.periodEnd, input.periodEnd),
    ))
    .limit(1))[0] ?? null;

  const status = summary.closable ? "closed" : "under_review";
  const payload = {
    employeeId: input.employeeId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    status,
    closedByUserId: summary.closable ? input.closedByUserId : null,
    closedAt: summary.closable ? new Date() : null,
    notes: input.notes ?? null,
    updatedAt: new Date(),
  } as any;

  if (existing) {
    await db.update(journeyClosures).set(payload).where(eq(journeyClosures.id, existing.id));
  } else {
    await db.insert(journeyClosures).values({
      ...payload,
      createdAt: new Date(),
    } as any);
  }

  return { success: true, status, summary };
}

export async function reopenJourneyPeriod(input: {
  closureId: number;
  reopenedByUserId: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const closure = (await db
    .select()
    .from(journeyClosures)
    .where(eq(journeyClosures.id, input.closureId))
    .limit(1))[0] ?? null;

  if (!closure) throw new Error("Fechamento V2 nao encontrado.");

  await db.update(journeyClosures).set({
    status: "reopened",
    reopenedByUserId: input.reopenedByUserId,
    reopenedAt: new Date(),
    notes: input.notes ?? closure.notes ?? null,
    updatedAt: new Date(),
  } as any).where(eq(journeyClosures.id, closure.id));

  return { success: true, closureId: closure.id };
}
