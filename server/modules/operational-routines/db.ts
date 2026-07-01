import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { getDb, createNotification } from "../../db.js";
import {
  kanbanCardAssignees,
  operationalClients,
  operationalRoutineOccurrences,
  operationalRoutineReminders,
  operationalRoutines,
  users,
  type InsertOperationalClient,
  type InsertOperationalRoutine,
  type InsertOperationalRoutineOccurrence,
  type OperationalClient,
  type OperationalRoutine,
  type OperationalRoutineOccurrence,
} from "../../../drizzle/schema.js";
import * as kanbanDb from "../kanban/db.js";
import { candidateForDate, daysUntil, reminderKey } from "./recurrence.js";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  return db;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((v) => v.trim()).filter(Boolean) : [];
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(Number).filter((v) => Number.isInteger(v) && v >= 0)
    : [];
}

export async function listClients(): Promise<OperationalClient[]> {
  const db = await requireDb();
  return db.select().from(operationalClients).orderBy(asc(operationalClients.name));
}

export async function createClient(data: InsertOperationalClient): Promise<{ id: number }> {
  const db = await requireDb();
  const result = await db.insert(operationalClients).values(data).$returningId();
  return { id: (result as any)[0].id };
}

export async function updateClient(id: number, data: Partial<InsertOperationalClient>): Promise<void> {
  const db = await requireDb();
  await db.update(operationalClients).set(data).where(eq(operationalClients.id, id));
}

export async function listRoutines(filter: { activeOnly?: boolean } = {}): Promise<Array<OperationalRoutine & { clientName: string }>> {
  const db = await requireDb();
  const rows = await db
    .select({ routine: operationalRoutines, clientName: operationalClients.name })
    .from(operationalRoutines)
    .innerJoin(operationalClients, eq(operationalClients.id, operationalRoutines.clientId))
    .where(filter.activeOnly ? eq(operationalRoutines.isActive, true) : undefined as any)
    .orderBy(asc(operationalClients.name), asc(operationalRoutines.title));
  return rows.map((row) => ({ ...row.routine, clientName: row.clientName }));
}

export async function getRoutine(id: number): Promise<(OperationalRoutine & { clientName: string }) | null> {
  const db = await requireDb();
  const rows = await db
    .select({ routine: operationalRoutines, clientName: operationalClients.name })
    .from(operationalRoutines)
    .innerJoin(operationalClients, eq(operationalClients.id, operationalRoutines.clientId))
    .where(eq(operationalRoutines.id, id))
    .limit(1);
  const row = rows[0];
  return row ? { ...row.routine, clientName: row.clientName } : null;
}

export async function createRoutine(data: InsertOperationalRoutine): Promise<{ id: number }> {
  const db = await requireDb();
  const result = await db.insert(operationalRoutines).values(data).$returningId();
  return { id: (result as any)[0].id };
}

export async function updateRoutine(id: number, data: Partial<InsertOperationalRoutine>): Promise<void> {
  const db = await requireDb();
  await db.update(operationalRoutines).set(data).where(eq(operationalRoutines.id, id));
}

export async function listOccurrences(filter: {
  from?: string;
  to?: string;
  status?: string;
  clientId?: number;
} = {}): Promise<Array<OperationalRoutineOccurrence & { routineTitle: string; routineType: string; clientName: string; assigneeUserId: number | null }>> {
  const db = await requireDb();
  const conditions: any[] = [];
  if (filter.from) conditions.push(sql`${operationalRoutineOccurrences.dueDate} >= ${filter.from}`);
  if (filter.to) conditions.push(sql`${operationalRoutineOccurrences.dueDate} <= ${filter.to}`);
  if (filter.status) conditions.push(eq(operationalRoutineOccurrences.status, filter.status as any));
  if (filter.clientId) conditions.push(eq(operationalRoutineOccurrences.clientId, filter.clientId));
  const rows = await db
    .select({
      occurrence: operationalRoutineOccurrences,
      routineTitle: operationalRoutines.title,
      routineType: operationalRoutines.routineType,
      clientName: operationalClients.name,
      assigneeUserId: operationalRoutines.assigneeUserId,
    })
    .from(operationalRoutineOccurrences)
    .innerJoin(operationalRoutines, eq(operationalRoutines.id, operationalRoutineOccurrences.routineId))
    .innerJoin(operationalClients, eq(operationalClients.id, operationalRoutineOccurrences.clientId))
    .where(conditions.length ? and(...conditions) : undefined as any)
    .orderBy(asc(operationalRoutineOccurrences.dueDate));
  return rows.map((row) => ({ ...row.occurrence, routineTitle: row.routineTitle, routineType: row.routineType, clientName: row.clientName, assigneeUserId: row.assigneeUserId }));
}

export async function findOccurrence(routineId: number, periodRef: string): Promise<OperationalRoutineOccurrence | null> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(operationalRoutineOccurrences)
    .where(and(eq(operationalRoutineOccurrences.routineId, routineId), eq(operationalRoutineOccurrences.periodRef, periodRef)))
    .limit(1);
  return rows[0] ?? null;
}

function cardTitle(routine: OperationalRoutine & { clientName: string }, periodRef: string): string {
  return `${routine.title} - ${routine.clientName} - ${periodRef}`;
}

function cardDescription(routine: OperationalRoutine & { clientName: string }, occurrence: { dueDate: string }): string {
  const lines = [
    `Cliente/setor: ${routine.clientName}`,
    `Tipo: ${routine.routineType}`,
    `Prazo operacional: ${occurrence.dueDate}`,
  ];
  if (routine.instructions) lines.push("", routine.instructions);
  return lines.join("\n");
}

export async function createOccurrenceFromRoutine(
  routine: OperationalRoutine & { clientName: string },
  actorUserId: number,
  baseDate = new Date(),
): Promise<{ occurrence: OperationalRoutineOccurrence; created: boolean }> {
  const db = await requireDb();
  const candidate = candidateForDate({
    frequency: routine.frequency,
    dayOfWeek: routine.dayOfWeek,
    dayOfMonth: routine.dayOfMonth,
    generateLeadDays: routine.generateLeadDays,
  }, baseDate);
  const existing = await findOccurrence(routine.id, candidate.periodRef);
  if (existing) return { occurrence: existing, created: false };

  const card =
    routine.boardId && routine.listId
      ? await kanbanDb.createCard({
          boardId: routine.boardId,
          listId: routine.listId,
          title: cardTitle(routine, candidate.periodRef),
          description: cardDescription(routine, candidate),
          priority: routine.priority,
          dueDate: new Date(`${candidate.dueDate}T00:00:00Z`),
          createdBy: actorUserId,
        })
      : null;

  if (card) {
    await kanbanDb.updateCard(card.id, {
      entityType: "operational_routine_occurrence",
    } as any);
    if (routine.assigneeUserId) {
      await kanbanDb.ensureBoardMembers(routine.boardId!, [routine.assigneeUserId], "viewer");
      await kanbanDb.setCardAssignees(card.id, [routine.assigneeUserId]);
    }
    for (const item of asStringArray(routine.checklistTemplate)) {
      await kanbanDb.createChecklistItem(card.id, item);
    }
  }

  const insert: InsertOperationalRoutineOccurrence = {
    routineId: routine.id,
    clientId: routine.clientId,
    periodRef: candidate.periodRef,
    dueDate: candidate.dueDate,
    cardId: card?.id ?? null,
    status: "pending",
  };
  const result = await db.insert(operationalRoutineOccurrences).values(insert).$returningId();
  const id = (result as any)[0].id as number;
  if (card) {
    await kanbanDb.updateCard(card.id, { entityId: id } as any);
  }
  const [occurrence] = await db.select().from(operationalRoutineOccurrences).where(eq(operationalRoutineOccurrences.id, id));
  return { occurrence: occurrence!, created: true };
}

export async function generateDueOccurrences(actorUserId: number, baseDate = new Date()): Promise<{ created: number; skipped: number }> {
  const routines = await listRoutines({ activeOnly: true });
  let created = 0;
  let skipped = 0;
  for (const routine of routines) {
    const result = await createOccurrenceFromRoutine(routine, actorUserId, baseDate);
    if (result.created) created++;
    else skipped++;
  }
  return { created, skipped };
}

export async function updateOccurrence(id: number, data: Partial<InsertOperationalRoutineOccurrence>): Promise<void> {
  const db = await requireDb();
  await db.update(operationalRoutineOccurrences).set(data).where(eq(operationalRoutineOccurrences.id, id));
}

export async function markNotApplicable(id: number): Promise<void> {
  await updateOccurrence(id, { status: "not_applicable" });
}

export async function getDashboardSummary(): Promise<{
  today: number;
  next7Days: number;
  overdue: number;
  waitingReturn: number;
  noAssignee: number;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const seven = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const rows = await listOccurrences();
  return {
    today: rows.filter((o) => o.dueDate === today && !["done", "not_applicable"].includes(o.status)).length,
    next7Days: rows.filter((o) => o.dueDate >= today && o.dueDate <= seven && !["done", "not_applicable"].includes(o.status)).length,
    overdue: rows.filter((o) => o.dueDate < today && !["done", "not_applicable"].includes(o.status)).length,
    waitingReturn: rows.filter((o) => o.status === "waiting_return").length,
    noAssignee: rows.filter((o) => !o.assigneeUserId).length,
  };
}

export async function dispatchRoutineReminders(baseDate = new Date()): Promise<number> {
  const db = await requireDb();
  const open = await listOccurrences();
  const openRows = open.filter((o) => !["done", "not_applicable"].includes(o.status));
  if (openRows.length === 0) return 0;
  const routineIds = Array.from(new Set(openRows.map((o) => o.routineId)));
  const routines = await db.select().from(operationalRoutines).where(inArray(operationalRoutines.id, routineIds));
  const routineById = new Map(routines.map((r) => [r.id, r]));
  let sent = 0;

  for (const occurrence of openRows) {
    const routine = routineById.get(occurrence.routineId);
    if (!routine?.assigneeUserId) continue;
    const remaining = daysUntil(occurrence.dueDate, baseDate);
    const reminderDays = asNumberArray(routine.reminderDays);
    const shouldSend = reminderDays.includes(remaining) || (remaining < 0 && routine.overdueReminderEnabled);
    if (!shouldSend) continue;
    const key = reminderKey(remaining < 0 ? -1 : remaining, occurrence.dueDate);
    const existing = await db
      .select()
      .from(operationalRoutineReminders)
      .where(and(eq(operationalRoutineReminders.occurrenceId, occurrence.id), eq(operationalRoutineReminders.reminderKey, key)))
      .limit(1);
    if (existing.length) continue;

    await db.insert(operationalRoutineReminders).values({ occurrenceId: occurrence.id, reminderKey: key });
    await createNotification({
      type: "Geral" as any,
      severity: remaining < 0 ? ("Crítico" as any) : ("Aviso" as any),
      title: remaining < 0 ? `Rotina atrasada: ${occurrence.routineTitle}` : `Rotina vence em ${remaining} dia(s): ${occurrence.routineTitle}`,
      message: `${occurrence.clientName}. Prazo: ${occurrence.dueDate}.`,
      userId: routine.assigneeUserId,
      dueDate: occurrence.dueDate as any,
    } as any);
    sent++;
  }
  return sent;
}
