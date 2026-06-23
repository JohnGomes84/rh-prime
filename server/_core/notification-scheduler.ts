import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import * as db from "../db.js";
import { notifications, employees as employeesTable } from "../../drizzle/schema.js";
import {
  kanbanBoards,
  kanbanCardAssignees,
  kanbanCards,
} from "../../drizzle/schema-kanban.js";
import { notifyKanbanCardDeadline } from "./kanban-notifications.js";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function alreadyNotified(opts: {
  type: string;
  relatedEmployeeId: number | null;
  dueDate: string;
}): Promise<boolean> {
  const conn = await db.getDb();
  if (!conn) return true;
  const conditions = [
    eq(notifications.type, opts.type as any),
    eq(notifications.dueDate, opts.dueDate as any),
  ];
  if (opts.relatedEmployeeId !== null) {
    conditions.push(eq(notifications.relatedEmployeeId, opts.relatedEmployeeId));
  } else {
    conditions.push(sql`${notifications.relatedEmployeeId} IS NULL`);
  }
  const rows = await conn
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(...conditions))
    .limit(1);
  return rows.length > 0;
}

async function notifyOnce(payload: {
  type: "Férias" | "ASO" | "Banco de Horas" | "Geral";
  title: string;
  message: string;
  severity: "Info" | "Aviso" | "Crítico";
  relatedEmployeeId: number | null;
  dueDate: string;
}): Promise<boolean> {
  if (await alreadyNotified({ type: payload.type, relatedEmployeeId: payload.relatedEmployeeId, dueDate: payload.dueDate })) {
    return false;
  }
  await db.createNotification({
    type: payload.type as any,
    title: payload.title,
    message: payload.message,
    severity: payload.severity as any,
    relatedEmployeeId: payload.relatedEmployeeId ?? undefined,
    dueDate: payload.dueDate as any,
  } as any);
  return true;
}

async function scanVacations(): Promise<number> {
  const upcoming = await db.getUpcomingVacationDeadlines(30);
  let created = 0;
  for (const v of upcoming as any[]) {
    const dueDate = new Date(v.concessionLimit).toISOString().slice(0, 10);
    const fired = await notifyOnce({
      type: "Férias",
      title: "⚠️ Prazo de férias se aproximando",
      message: `Período concessivo termina em ${dueDate}.`,
      severity: "Aviso",
      relatedEmployeeId: v.employeeId ?? null,
      dueDate,
    });
    if (fired) created++;
  }
  const overdue = await db.getOverdueVacations();
  for (const v of overdue as any[]) {
    const dueDate = new Date(v.concessionLimit).toISOString().slice(0, 10);
    const fired = await notifyOnce({
      type: "Férias",
      title: "🚨 Férias vencidas",
      message: `Período concessivo venceu em ${dueDate}.`,
      severity: "Crítico",
      relatedEmployeeId: v.employeeId ?? null,
      dueDate,
    });
    if (fired) created++;
  }
  return created;
}

async function scanMedicalExams(): Promise<number> {
  const expiring = await db.getUpcomingExamExpirations(60);
  let created = 0;
  for (const e of expiring as any[]) {
    const dueDate = new Date(e.expiryDate).toISOString().slice(0, 10);
    const fired = await notifyOnce({
      type: "ASO",
      title: "🩺 ASO expira em breve",
      message: `Exame médico vence em ${dueDate}.`,
      severity: "Aviso",
      relatedEmployeeId: e.employeeId ?? null,
      dueDate,
    });
    if (fired) created++;
  }
  const expired = await db.getExpiredExams();
  for (const e of expired as any[]) {
    const dueDate = new Date(e.expiryDate).toISOString().slice(0, 10);
    const fired = await notifyOnce({
      type: "ASO",
      title: "🚨 ASO vencido",
      message: `Exame médico venceu em ${dueDate}.`,
      severity: "Crítico",
      relatedEmployeeId: e.employeeId ?? null,
      dueDate,
    });
    if (fired) created++;
  }
  return created;
}

async function scanTimeBank(): Promise<number> {
  const expiring = await db.getExpiringTimeBank(30);
  let created = 0;
  for (const t of expiring as any[]) {
    const dueDate = new Date(t.expiryDate).toISOString().slice(0, 10);
    const fired = await notifyOnce({
      type: "Banco de Horas",
      title: "⏰ Banco de horas expirando",
      message: `Saldo expira em ${dueDate}.`,
      severity: "Aviso",
      relatedEmployeeId: t.employeeId ?? null,
      dueDate,
    });
    if (fired) created++;
  }
  return created;
}

async function scanBirthdays(): Promise<number> {
  const conn = await db.getDb();
  if (!conn) return 0;
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const rows = await conn
    .select({ id: employeesTable.id, fullName: employeesTable.fullName, birthDate: employeesTable.birthDate })
    .from(employeesTable)
    .where(
      and(
        sql`MONTH(${employeesTable.birthDate}) = ${month}`,
        sql`DAY(${employeesTable.birthDate}) = ${day}`,
        eq(employeesTable.status, "Ativo")
      )
    );
  const dueDate = todayStr();
  let created = 0;
  for (const r of rows) {
    const fired = await notifyOnce({
      type: "Geral",
      title: "🎂 Aniversariante do dia",
      message: `${r.fullName} faz aniversário hoje.`,
      severity: "Info",
      relatedEmployeeId: r.id,
      dueDate,
    });
    if (fired) created++;
  }
  return created;
}

async function scanKanbanDeadlines(): Promise<number> {
  const conn = await db.getDb();
  if (!conn) return 0;

  const todayDate = new Date();
  const today = todayDate.toISOString().slice(0, 10);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const threeDaysDate = new Date(todayDate);
  threeDaysDate.setDate(threeDaysDate.getDate() + 3);
  const threeDays = threeDaysDate.toISOString().slice(0, 10);

  const candidates = await conn
    .select({
      cardId: kanbanCards.id,
      cardTitle: kanbanCards.title,
      dueDate: kanbanCards.dueDate,
      boardId: kanbanCards.boardId,
      boardName: kanbanBoards.name,
    })
    .from(kanbanCards)
    .innerJoin(kanbanBoards, eq(kanbanBoards.id, kanbanCards.boardId))
    .where(
      and(
        eq(kanbanCards.archived, false),
        sql`${kanbanCards.completedAt} IS NULL`,
        sql`${kanbanCards.dueDate} IS NOT NULL`,
        or(
          eq(kanbanCards.dueDate, threeDays as any),
          eq(kanbanCards.dueDate, tomorrow as any),
          lt(kanbanCards.dueDate, today as any)
        )
      )
    );

  if (candidates.length === 0) return 0;

  const cardIds = candidates.map((c) => c.cardId);
  const assignees = await conn
    .select({
      cardId: kanbanCardAssignees.cardId,
      userId: kanbanCardAssignees.userId,
    })
    .from(kanbanCardAssignees)
    .where(inArray(kanbanCardAssignees.cardId, cardIds));

  const assigneesByCard = new Map<number, number[]>();
  for (const a of assignees) {
    const list = assigneesByCard.get(a.cardId) ?? [];
    list.push(a.userId);
    assigneesByCard.set(a.cardId, list);
  }

  let dispatched = 0;
  for (const card of candidates) {
    const targets = assigneesByCard.get(card.cardId);
    if (!targets || targets.length === 0) continue;

    const dueIso = (card.dueDate as unknown as string) ?? "";
    const overdue = dueIso < today;
    const isDueTomorrow = dueIso === tomorrow;
    const isDue3Days = dueIso === threeDays;

    let notifTitle: string;
    let severity: "Info" | "Aviso" | "Crítico";
    if (overdue) {
      notifTitle = `🚨 Tarefa atrasada: ${card.cardTitle}`;
      severity = "Crítico";
    } else if (isDueTomorrow) {
      notifTitle = `⏰ Tarefa vence amanhã: ${card.cardTitle}`;
      severity = "Aviso";
    } else if (isDue3Days) {
      notifTitle = `📅 Tarefa vence em 3 dias: ${card.cardTitle}`;
      severity = "Info";
    } else {
      continue;
    }

    for (const userId of targets) {
      // Deduplicate: check if we already sent this exact deadline notification
      if (await alreadyNotified({ type: "Geral", relatedEmployeeId: null, dueDate: dueIso })) continue;

      try {
        // notifyKanbanCardDeadline handles: DB persist + WebSocket + email
        await notifyKanbanCardDeadline({
          userId,
          cardId: card.cardId,
          cardTitle: card.cardTitle,
          boardId: card.boardId,
          boardName: card.boardName,
          dueDate: dueIso,
          overdue,
        });
        dispatched++;
      } catch (err) {
        console.warn("[Scheduler] kanban deadline dispatch failed:", err);
      }
    }
  }
  return dispatched;
}

export async function runNotificationScan(): Promise<{
  vacations: number;
  exams: number;
  timeBank: number;
  birthdays: number;
  kanban: number;
}> {
  const [vacations, exams, timeBank, birthdays, kanban] = await Promise.all([
    scanVacations().catch((e) => { console.warn("[Scheduler] vacations scan:", e); return 0; }),
    scanMedicalExams().catch((e) => { console.warn("[Scheduler] exams scan:", e); return 0; }),
    scanTimeBank().catch((e) => { console.warn("[Scheduler] time bank scan:", e); return 0; }),
    scanBirthdays().catch((e) => { console.warn("[Scheduler] birthdays scan:", e); return 0; }),
    scanKanbanDeadlines().catch((e) => { console.warn("[Scheduler] kanban scan:", e); return 0; }),
  ]);
  const total = vacations + exams + timeBank + birthdays + kanban;
  if (total > 0) {
    console.log(`[Scheduler] created ${total} notifications (vac:${vacations} exams:${exams} bank:${timeBank} bday:${birthdays} kanban:${kanban})`);
  }
  return { vacations, exams, timeBank, birthdays, kanban };
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startNotificationScheduler() {
  if (intervalHandle) return;
  setTimeout(() => { void runNotificationScan(); }, 5_000);
  intervalHandle = setInterval(() => { void runNotificationScan(); }, SIX_HOURS_MS);
  console.log("[Scheduler] notification scanner started (every 6h)");
}

export function stopNotificationScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
