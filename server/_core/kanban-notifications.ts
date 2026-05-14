import { eq } from "drizzle-orm";
import * as db from "../db.js";
import { users } from "../../drizzle/schema.js";
import { broadcastNotification } from "./websocket.js";
import {
  sendEmail,
  generateKanbanAssignmentEmail,
  generateKanbanCommentEmail,
  generateKanbanDeadlineEmail,
} from "../integrations/email-service.js";
import { ENV } from "./env.js";

const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://public-self-eight.vercel.app";

interface AssignmentInput {
  userId: number;
  cardId: number;
  cardTitle: string;
  boardId: number;
  boardName: string;
  dueDate?: Date | string | null;
  triggeredByUserId?: number;
}

function dueDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function getUserContact(userId: number): Promise<{ name: string | null; email: string | null } | null> {
  const conn = await db.getDb();
  if (!conn) return null;
  const rows = await conn
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

function cardUrl(boardId: number, cardId: number) {
  return `${APP_BASE_URL}/kanban/${boardId}?card=${cardId}`;
}

export async function notifyKanbanCardAssignment(input: AssignmentInput) {
  if (input.triggeredByUserId === input.userId) return;

  const due = dueDateString(input.dueDate);
  const title = `📋 Você foi designado para "${input.cardTitle}"`;
  const message = due
    ? `Quadro ${input.boardName}. Prazo: ${due}.`
    : `Quadro ${input.boardName}.`;

  try {
    await db.createNotification({
      type: "Geral" as any,
      severity: "Info" as any,
      title,
      message,
      userId: input.userId,
      dueDate: due ? (due as any) : null,
    } as any);
  } catch (err) {
    console.error("[kanban-notify] persist failed:", err);
  }

  try {
    await broadcastNotification({
      type: "info",
      title,
      message,
      userId: input.userId,
      data: { kind: "kanban_assignment", boardId: input.boardId, cardId: input.cardId },
    });
  } catch (err) {
    if (!ENV.isProduction) console.error("[kanban-notify] WS broadcast failed:", err);
  }

  try {
    const contact = await getUserContact(input.userId);
    if (contact?.email) {
      await sendEmail({
        to: contact.email,
        subject: title,
        html: generateKanbanAssignmentEmail({
          assigneeName: contact.name ?? "colega",
          cardTitle: input.cardTitle,
          boardName: input.boardName,
          dueDate: due,
          cardUrl: cardUrl(input.boardId, input.cardId),
        }),
      });
    }
  } catch (err) {
    console.error("[kanban-notify] email failed:", err);
  }
}

interface DeadlineInput {
  userId: number;
  cardId: number;
  cardTitle: string;
  boardId: number;
  boardName: string;
  dueDate: string;
  overdue: boolean;
}

export async function notifyKanbanCardDeadline(input: DeadlineInput) {
  const title = input.overdue
    ? `🚨 Tarefa atrasada: "${input.cardTitle}"`
    : `⏰ Tarefa vence amanhã: "${input.cardTitle}"`;
  const message = `Quadro ${input.boardName}. Prazo: ${input.dueDate}${input.overdue ? " (vencido)" : ""}.`;

  try {
    await db.createNotification({
      type: "Geral" as any,
      severity: input.overdue ? ("Crítico" as any) : ("Aviso" as any),
      title,
      message,
      userId: input.userId,
      dueDate: input.dueDate as any,
    } as any);
  } catch (err) {
    console.error("[kanban-notify] deadline persist failed:", err);
  }

  try {
    await broadcastNotification({
      type: input.overdue ? "alert" : "info",
      title,
      message,
      userId: input.userId,
      data: { kind: "kanban_deadline", boardId: input.boardId, cardId: input.cardId },
    });
  } catch {
    /* WS no-op em serverless */
  }

  try {
    const contact = await getUserContact(input.userId);
    if (contact?.email) {
      await sendEmail({
        to: contact.email,
        subject: title,
        html: generateKanbanDeadlineEmail({
          assigneeName: contact.name ?? "colega",
          cardTitle: input.cardTitle,
          boardName: input.boardName,
          dueDate: input.dueDate,
          overdue: input.overdue,
          cardUrl: cardUrl(input.boardId, input.cardId),
        }),
      });
    }
  } catch (err) {
    console.error("[kanban-notify] deadline email failed:", err);
  }
}

interface CommentInput {
  userId: number;
  cardId: number;
  cardTitle: string;
  boardId: number;
  boardName: string;
  authorName: string;
  bodyPreview: string;
}

export async function notifyKanbanCardComment(input: CommentInput) {
  const title = `💬 ${input.authorName} comentou em "${input.cardTitle}"`;
  const message = `${input.boardName}: ${input.bodyPreview}`;

  try {
    await db.createNotification({
      type: "Geral" as any,
      severity: "Info" as any,
      title,
      message,
      userId: input.userId,
    } as any);
  } catch (err) {
    console.error("[kanban-notify] comment persist failed:", err);
  }

  try {
    await broadcastNotification({
      type: "info",
      title,
      message,
      userId: input.userId,
      data: { kind: "kanban_comment", boardId: input.boardId, cardId: input.cardId },
    });
  } catch { /* WS no-op */ }

  try {
    const contact = await getUserContact(input.userId);
    if (contact?.email) {
      await sendEmail({
        to: contact.email,
        subject: title,
        html: generateKanbanCommentEmail({
          assigneeName: contact.name ?? "colega",
          cardTitle: input.cardTitle,
          boardName: input.boardName,
          authorName: input.authorName,
          bodyPreview: input.bodyPreview,
          cardUrl: cardUrl(input.boardId, input.cardId),
        }),
      });
    }
  } catch (err) {
    console.error("[kanban-notify] comment email failed:", err);
  }
}
