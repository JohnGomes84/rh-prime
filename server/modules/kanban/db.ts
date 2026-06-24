import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "../../db.js";
import {
  departments,
  employees,
  kanbanBoardMembers,
  kanbanBoards,
  kanbanCardAssignees,
  kanbanCardAttachments,
  kanbanCardComments,
  kanbanChecklistItems,
  kanbanCardLabels,
  kanbanCards,
  kanbanLabels,
  kanbanLists,
  type InsertKanbanBoard,
  type InsertKanbanCard,
  type InsertKanbanCardAttachment,
  type InsertKanbanCardComment,
  type InsertKanbanChecklistItem,
  type InsertKanbanLabel,
  type InsertKanbanList,
  type KanbanBoard,
  type KanbanCard,
  type KanbanCardAttachment,
  type KanbanCardComment,
  type KanbanChecklistItem,
  type KanbanList,
  users,
} from "../../../drizzle/schema.js";
import { withDBRetry } from "../../utils/retry.js";

const POSITION_GAP = 1024;

export type BoardAccessRole = "admin" | "editor" | "viewer";

export type KanbanAssigneeDetails = {
  cardId: number;
  userId: number;
  employeeId: number | null;
  name: string | null;
  email: string | null;
  fullName: string | null;
  avatarFallback: string | null;
  acceptedAt: Date | null;
};

export type KanbanBoardMemberDetails = {
  id: number;
  boardId: number;
  userId: number;
  role: BoardAccessRole;
  addedAt: Date;
  employeeId: number | null;
  userName: string | null;
  userEmail: string | null;
  employeeName: string | null;
  departmentId: number | null;
};

export type KanbanUserCandidate = {
  userId: number;
  userName: string | null;
  userEmail: string | null;
  employeeId: number | null;
  employeeName: string | null;
  departmentId: number | null;
};

export type KanbanChecklistItemDetails = KanbanChecklistItem;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

function buildAvatarFallback(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return null;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

async function getUserDepartmentId(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ departmentId: employees.departmentId })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);
  return rows[0]?.departmentId ?? null;
}

// ============================================================
// ACCESS CONTROL
// ============================================================
export async function getUserBoardRole(userId: number, boardId: number, userRole?: string): Promise<BoardAccessRole | null> {
  const db = await requireDb();
  if (userRole === "admin") return "admin";

  const board = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.archived, false)))
    .limit(1);
  if (board.length === 0) return null;
  const b = board[0]!;

  if (b.ownerId === userId) return "admin";
  if (b.visibility === "public") return "viewer";
  if (b.visibility === "team" && b.departmentId != null) {
    const userDepartmentId = await getUserDepartmentId(userId);
    if (userDepartmentId != null && userDepartmentId === b.departmentId) return "viewer";
  }

  const membership = await db
    .select()
    .from(kanbanBoardMembers)
    .where(and(eq(kanbanBoardMembers.boardId, boardId), eq(kanbanBoardMembers.userId, userId)))
    .limit(1);
  if (membership.length > 0) return membership[0]!.role as BoardAccessRole;

  return null;
}

// ============================================================
// BOARDS
// ============================================================
export async function listBoardsForUser(userId: number, userRole?: string): Promise<KanbanBoard[]> {
  const db = await requireDb();

  if (userRole === "admin") {
    return db
      .select()
      .from(kanbanBoards)
      .where(eq(kanbanBoards.archived, false))
      .orderBy(desc(kanbanBoards.updatedAt));
  }

  const owned = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.ownerId, userId), eq(kanbanBoards.archived, false)));

  const memberRows = await db
    .select({ board: kanbanBoards })
    .from(kanbanBoardMembers)
    .innerJoin(kanbanBoards, eq(kanbanBoards.id, kanbanBoardMembers.boardId))
    .where(and(eq(kanbanBoardMembers.userId, userId), eq(kanbanBoards.archived, false)));

  const publicBoards = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.visibility, "public"), eq(kanbanBoards.archived, false)));

  const userDepartmentId = await getUserDepartmentId(userId);
  const teamBoards =
    userDepartmentId == null
      ? []
      : await db
          .select()
          .from(kanbanBoards)
          .where(
            and(
              eq(kanbanBoards.visibility, "team"),
              eq(kanbanBoards.departmentId, userDepartmentId),
              eq(kanbanBoards.archived, false),
            ),
          );

  const map = new Map<number, KanbanBoard>();
  for (const b of owned) map.set(b.id, b);
  for (const r of memberRows) map.set(r.board.id, r.board);
  for (const b of publicBoards) map.set(b.id, b);
  for (const b of teamBoards) map.set(b.id, b);

  return Array.from(map.values()).sort((a, b) => (b.updatedAt as any) - (a.updatedAt as any));
}

export async function getBoardById(boardId: number): Promise<KanbanBoard | null> {
  const db = await requireDb();
  const rows = await db.select().from(kanbanBoards).where(eq(kanbanBoards.id, boardId)).limit(1);
  return rows[0] ?? null;
}

export async function createBoard(data: InsertKanbanBoard): Promise<{ id: number }> {
  const db = await requireDb();
  return withDBRetry(async () => {
    const result = await db.insert(kanbanBoards).values(data).$returningId();
    return { id: (result as any)[0].id };
  }, "kanban.createBoard");
}

export async function updateBoard(id: number, data: Partial<InsertKanbanBoard>): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanBoards).set(data).where(eq(kanbanBoards.id, id));
}

export async function archiveBoard(id: number): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanBoards).set({ archived: true }).where(eq(kanbanBoards.id, id));
}

// ============================================================
// LISTS
// ============================================================
export async function listListsByBoard(boardId: number): Promise<KanbanList[]> {
  const db = await requireDb();
  return db
    .select()
    .from(kanbanLists)
    .where(and(eq(kanbanLists.boardId, boardId), eq(kanbanLists.archived, false)))
    .orderBy(asc(kanbanLists.position));
}

export async function createList(boardId: number, name: string): Promise<{ id: number; position: number }> {
  const db = await requireDb();
  return withDBRetry(async () => {
    const last = await db
      .select({ position: kanbanLists.position })
      .from(kanbanLists)
      .where(and(eq(kanbanLists.boardId, boardId), eq(kanbanLists.archived, false)))
      .orderBy(desc(kanbanLists.position))
      .limit(1);
    const position = (last[0]?.position ?? 0) + POSITION_GAP;
    const result = await db.insert(kanbanLists).values({ boardId, name, position }).$returningId();
    return { id: (result as any)[0].id, position };
  }, "kanban.createList");
}

export async function updateList(id: number, data: Partial<InsertKanbanList>): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanLists).set(data).where(eq(kanbanLists.id, id));
}

export async function archiveList(id: number): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanLists).set({ archived: true }).where(eq(kanbanLists.id, id));
}

export async function reorderLists(boardId: number, orderedIds: number[]): Promise<void> {
  const db = await requireDb();
  return withDBRetry(
    () =>
      db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT id FROM kanban_lists WHERE board_id = ${boardId} AND archived = false FOR UPDATE`,
        );
        for (let i = 0; i < orderedIds.length; i++) {
          const newPos = (i + 1) * POSITION_GAP;
          await tx
            .update(kanbanLists)
            .set({ position: newPos })
            .where(and(eq(kanbanLists.id, orderedIds[i]!), eq(kanbanLists.boardId, boardId)));
        }
      }),
    "kanban.reorderLists",
  );
}

// ============================================================
// CARDS
// ============================================================
export async function listCardsByBoard(boardId: number): Promise<KanbanCard[]> {
  const db = await requireDb();
  return db
    .select()
    .from(kanbanCards)
    .where(and(eq(kanbanCards.boardId, boardId), eq(kanbanCards.archived, false)))
    .orderBy(asc(kanbanCards.listId), asc(kanbanCards.position));
}

export interface ChecklistCounts {
  cardId: number;
  total: number;
  done: number;
}

export async function listChecklistCountsForCards(cardIds: number[]): Promise<ChecklistCounts[]> {
  if (cardIds.length === 0) return [];
  const db = await requireDb();
  const rows = await db
    .select({
      cardId: kanbanChecklistItems.cardId,
      total: sql<number>`COUNT(*)`,
      done: sql<number>`SUM(CASE WHEN ${kanbanChecklistItems.isDone} = TRUE THEN 1 ELSE 0 END)`,
    })
    .from(kanbanChecklistItems)
    .where(inArray(kanbanChecklistItems.cardId, cardIds))
    .groupBy(kanbanChecklistItems.cardId);

  return rows.map((row) => ({
    cardId: row.cardId,
    total: Number(row.total ?? 0),
    done: Number(row.done ?? 0),
  }));
}

export async function getCardById(id: number): Promise<KanbanCard | null> {
  const db = await requireDb();
  const rows = await db.select().from(kanbanCards).where(eq(kanbanCards.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCard(input: {
  listId: number;
  boardId: number;
  title: string;
  description?: string | null;
  createdBy: number;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: Date | null;
}): Promise<{ id: number; position: number }> {
  const db = await requireDb();
  return withDBRetry(async () => {
    const last = await db
      .select({ position: kanbanCards.position })
      .from(kanbanCards)
      .where(and(eq(kanbanCards.listId, input.listId), eq(kanbanCards.archived, false)))
      .orderBy(desc(kanbanCards.position))
      .limit(1);
    const position = (last[0]?.position ?? 0) + POSITION_GAP;
    const result = await db
      .insert(kanbanCards)
      .values({
        listId: input.listId,
        boardId: input.boardId,
        title: input.title,
        description: input.description ?? null,
        position,
        priority: input.priority ?? "medium",
        dueDate: input.dueDate ?? null,
        createdBy: input.createdBy,
      })
      .$returningId();
    return { id: (result as any)[0].id, position };
  }, "kanban.createCard");
}

export async function updateCard(id: number, data: Partial<InsertKanbanCard>): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanCards).set(data).where(eq(kanbanCards.id, id));
}

export async function archiveCard(id: number): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanCards).set({ archived: true }).where(eq(kanbanCards.id, id));
}

// ============================================================
// CHECKLIST
// ============================================================
export async function listChecklistItems(cardId: number): Promise<KanbanChecklistItemDetails[]> {
  const db = await requireDb();
  return db
    .select()
    .from(kanbanChecklistItems)
    .where(eq(kanbanChecklistItems.cardId, cardId))
    .orderBy(asc(kanbanChecklistItems.position));
}

export async function createChecklistItem(cardId: number, content: string) {
  const db = await requireDb();
  return withDBRetry(async () => {
    const last = await db
      .select({ position: kanbanChecklistItems.position })
      .from(kanbanChecklistItems)
      .where(eq(kanbanChecklistItems.cardId, cardId))
      .orderBy(desc(kanbanChecklistItems.position))
      .limit(1);
    const position = (last[0]?.position ?? 0) + POSITION_GAP;
    const result = await db
      .insert(kanbanChecklistItems)
      .values({ cardId, content, position })
      .$returningId();
    return { id: (result as any)[0].id, position };
  }, "kanban.createChecklistItem");
}

export async function updateChecklistItem(id: number, data: Partial<InsertKanbanChecklistItem>): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanChecklistItems).set(data).where(eq(kanbanChecklistItems.id, id));
}

export async function deleteChecklistItem(id: number): Promise<void> {
  const db = await requireDb();
  await db.delete(kanbanChecklistItems).where(eq(kanbanChecklistItems.id, id));
}

/**
 * Move card to a different list/position.
 * Uses SELECT FOR UPDATE on involved lists to prevent races when two users move concurrently.
 * The toPosition is interpreted as the index where the card should land in the target list.
 */
export async function moveCard(args: {
  cardId: number;
  toListId: number;
  toIndex: number;
}): Promise<{ position: number }> {
  const db = await requireDb();
  return withDBRetry(
    () =>
      db.transaction(async (tx) => {
        // Lock the card itself plus all cards in source and target lists.
        const cardRows = await tx
          .select()
          .from(kanbanCards)
          .where(eq(kanbanCards.id, args.cardId))
          .limit(1)
          .for("update");
        if (cardRows.length === 0) throw new Error("Card not found");
        const card = cardRows[0]!;
        const fromListId = card.listId;

        await tx.execute(
          sql`SELECT id FROM kanban_cards WHERE list_id IN (${fromListId}, ${args.toListId}) AND archived = false FOR UPDATE`,
        );

        const targetCards = await tx
          .select({ id: kanbanCards.id, position: kanbanCards.position })
          .from(kanbanCards)
          .where(and(eq(kanbanCards.listId, args.toListId), eq(kanbanCards.archived, false)))
          .orderBy(asc(kanbanCards.position));

        const sansSelf = targetCards.filter((c) => c.id !== args.cardId);
        const clampedIndex = Math.max(0, Math.min(args.toIndex, sansSelf.length));

        let newPosition: number;
        if (sansSelf.length === 0) {
          newPosition = POSITION_GAP;
        } else if (clampedIndex === 0) {
          newPosition = sansSelf[0]!.position - POSITION_GAP;
        } else if (clampedIndex >= sansSelf.length) {
          newPosition = sansSelf[sansSelf.length - 1]!.position + POSITION_GAP;
        } else {
          const prev = sansSelf[clampedIndex - 1]!.position;
          const next = sansSelf[clampedIndex]!.position;
          newPosition = (prev + next) / 2;
        }

        const gapTooSmall =
          clampedIndex > 0 &&
          clampedIndex < sansSelf.length &&
          Math.abs(sansSelf[clampedIndex]!.position - sansSelf[clampedIndex - 1]!.position) < 0.0001;

        if (gapTooSmall) {
          // Rebalance target list
          const withSelf = [...sansSelf];
          withSelf.splice(clampedIndex, 0, { id: args.cardId, position: 0 });
          for (let i = 0; i < withSelf.length; i++) {
            await tx
              .update(kanbanCards)
              .set({ position: (i + 1) * POSITION_GAP })
              .where(eq(kanbanCards.id, withSelf[i]!.id));
          }
          await tx
            .update(kanbanCards)
            .set({ listId: args.toListId })
            .where(eq(kanbanCards.id, args.cardId));
          const finalRow = await tx
            .select({ position: kanbanCards.position })
            .from(kanbanCards)
            .where(eq(kanbanCards.id, args.cardId))
            .limit(1);
          return { position: finalRow[0]?.position ?? (clampedIndex + 1) * POSITION_GAP };
        }

        await tx
          .update(kanbanCards)
          .set({ listId: args.toListId, position: newPosition })
          .where(eq(kanbanCards.id, args.cardId));

        return { position: newPosition };
      }),
    "kanban.moveCard",
  );
}

// ============================================================
// LABELS
// ============================================================
export async function listLabelsByBoard(boardId: number) {
  const db = await requireDb();
  return db.select().from(kanbanLabels).where(eq(kanbanLabels.boardId, boardId));
}

export async function createLabel(data: InsertKanbanLabel): Promise<{ id: number }> {
  const db = await requireDb();
  const result = await db.insert(kanbanLabels).values(data).$returningId();
  return { id: (result as any)[0].id };
}

export async function updateLabel(id: number, data: Partial<InsertKanbanLabel>): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanLabels).set(data).where(eq(kanbanLabels.id, id));
}

export async function deleteLabel(id: number): Promise<void> {
  const db = await requireDb();
  await db.delete(kanbanCardLabels).where(eq(kanbanCardLabels.labelId, id));
  await db.delete(kanbanLabels).where(eq(kanbanLabels.id, id));
}

export async function setCardLabels(cardId: number, labelIds: number[]): Promise<void> {
  const db = await requireDb();
  return withDBRetry(
    () =>
      db.transaction(async (tx) => {
        await tx.delete(kanbanCardLabels).where(eq(kanbanCardLabels.cardId, cardId));
        if (labelIds.length > 0) {
          await tx.insert(kanbanCardLabels).values(labelIds.map((labelId) => ({ cardId, labelId })));
        }
      }),
    "kanban.setCardLabels",
  );
}

export async function listCardLabels(cardIds: number[]) {
  if (cardIds.length === 0) return [];
  const db = await requireDb();
  return db
    .select({
      cardId: kanbanCardLabels.cardId,
      labelId: kanbanCardLabels.labelId,
      name: kanbanLabels.name,
      color: kanbanLabels.color,
    })
    .from(kanbanCardLabels)
    .innerJoin(kanbanLabels, eq(kanbanLabels.id, kanbanCardLabels.labelId))
    .where(inArray(kanbanCardLabels.cardId, cardIds));
}

// ============================================================
// ASSIGNEES
// ============================================================
export async function setCardAssignees(cardId: number, userIds: number[]): Promise<void> {
  const db = await requireDb();
  return withDBRetry(
    () =>
      db.transaction(async (tx) => {
        await tx.delete(kanbanCardAssignees).where(eq(kanbanCardAssignees.cardId, cardId));
        if (userIds.length > 0) {
          await tx.insert(kanbanCardAssignees).values(userIds.map((userId) => ({ cardId, userId })));
        }
      }),
    "kanban.setCardAssignees",
  );
}

export async function listCardAssignees(cardIds: number[]) {
  if (cardIds.length === 0) return [];
  const db = await requireDb();
  const rows = await db
    .select({
      cardId: kanbanCardAssignees.cardId,
      userId: kanbanCardAssignees.userId,
      employeeId: employees.id,
      userName: users.name,
      userEmail: users.email,
      employeeName: employees.fullName,
      acceptedAt: kanbanCardAssignees.acceptedAt,
    })
    .from(kanbanCardAssignees)
    .leftJoin(users, eq(users.id, kanbanCardAssignees.userId))
    .leftJoin(
      employees,
      or(eq(employees.userId, kanbanCardAssignees.userId), eq(employees.id, kanbanCardAssignees.employeeId)),
    )
    .where(inArray(kanbanCardAssignees.cardId, cardIds));

  return rows.map((row) => ({
    cardId: row.cardId,
    userId: row.userId,
    employeeId: row.employeeId ?? null,
    name: row.employeeName ?? row.userName ?? null,
    email: row.userEmail ?? null,
    fullName: row.employeeName ?? row.userName ?? null,
    avatarFallback: buildAvatarFallback(row.employeeName ?? row.userName, row.userEmail),
    acceptedAt: row.acceptedAt ?? null,
  })) satisfies KanbanAssigneeDetails[];
}

export async function acceptCardAssignment(cardId: number, userId: number): Promise<boolean> {
  const db = await requireDb();
  const result = await db
    .update(kanbanCardAssignees)
    .set({ acceptedAt: new Date() })
    .where(
      and(
        eq(kanbanCardAssignees.cardId, cardId),
        eq(kanbanCardAssignees.userId, userId),
      ),
    );
  return (result as any)[0]?.affectedRows > 0;
}

// ============================================================
// BOARD MEMBERS
// ============================================================
export async function listBoardMembers(boardId: number) {
  const db = await requireDb();
  const board = await getBoardById(boardId);
  if (!board) return [];
  const rows = await db
    .select({
      id: kanbanBoardMembers.id,
      boardId: kanbanBoardMembers.boardId,
      userId: kanbanBoardMembers.userId,
      role: kanbanBoardMembers.role,
      addedAt: kanbanBoardMembers.addedAt,
      employeeId: employees.id,
      userName: users.name,
      userEmail: users.email,
      employeeName: employees.fullName,
      departmentId: employees.departmentId,
    })
    .from(kanbanBoardMembers)
    .leftJoin(users, eq(users.id, kanbanBoardMembers.userId))
    .leftJoin(employees, eq(employees.userId, kanbanBoardMembers.userId))
    .where(eq(kanbanBoardMembers.boardId, boardId));

  const members = rows.map((row) => ({
    id: row.id,
    boardId: row.boardId,
    userId: row.userId,
    role: row.role as BoardAccessRole,
    addedAt: row.addedAt,
    employeeId: row.employeeId ?? null,
    userName: row.userName ?? null,
    userEmail: row.userEmail ?? null,
    employeeName: row.employeeName ?? null,
    departmentId: row.departmentId ?? null,
  })) satisfies KanbanBoardMemberDetails[];

  if (members.some((member) => member.userId === board.ownerId)) {
    return members;
  }

  const ownerRows = await db
    .select({
      id: users.id,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      employeeId: employees.id,
      employeeName: employees.fullName,
      departmentId: employees.departmentId,
    })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id))
    .where(eq(users.id, board.ownerId))
    .limit(1);

  const owner = ownerRows[0];
  if (!owner) return members;

  return [
    {
      id: -owner.id,
      boardId,
      userId: owner.userId,
      role: "admin",
      addedAt: board.createdAt,
      employeeId: owner.employeeId ?? null,
      userName: owner.userName ?? null,
      userEmail: owner.userEmail ?? null,
      employeeName: owner.employeeName ?? null,
      departmentId: owner.departmentId ?? null,
    },
    ...members,
  ];
}

export async function addBoardMember(boardId: number, userId: number, role: BoardAccessRole = "editor") {
  const db = await requireDb();
  const existing = await db
    .select()
    .from(kanbanBoardMembers)
    .where(and(eq(kanbanBoardMembers.boardId, boardId), eq(kanbanBoardMembers.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(kanbanBoardMembers)
      .set({ role })
      .where(and(eq(kanbanBoardMembers.boardId, boardId), eq(kanbanBoardMembers.userId, userId)));
    return { id: existing[0]!.id };
  }
  const result = await db.insert(kanbanBoardMembers).values({ boardId, userId, role }).$returningId();
  return { id: (result as any)[0].id };
}

export async function removeBoardMember(boardId: number, userId: number) {
  const db = await requireDb();
  await db
    .delete(kanbanBoardMembers)
    .where(and(eq(kanbanBoardMembers.boardId, boardId), eq(kanbanBoardMembers.userId, userId)));
}

export async function listBoardUserCandidates(boardId: number) {
  const db = await requireDb();
  const board = await getBoardById(boardId);
  const rows = await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      employeeId: employees.id,
      employeeName: employees.fullName,
      departmentId: employees.departmentId,
    })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id));

  const filtered = board?.visibility === "team" && board.departmentId != null
    ? rows.filter((row) => row.departmentId === board.departmentId || row.userId === board.ownerId)
    : rows;

  return filtered
    .map((row) => ({
      userId: row.userId,
      userName: row.userName ?? null,
      userEmail: row.userEmail ?? null,
      employeeId: row.employeeId ?? null,
      employeeName: row.employeeName ?? null,
      departmentId: row.departmentId ?? null,
    }))
    .sort((left, right) => {
      const leftName = left.employeeName ?? left.userName ?? left.userEmail ?? `${left.userId}`;
      const rightName = right.employeeName ?? right.userName ?? right.userEmail ?? `${right.userId}`;
      return leftName.localeCompare(rightName, "pt-BR");
    }) satisfies KanbanUserCandidate[];
}

// ============================================================
// COMMENTS
// ============================================================
export interface KanbanCardCommentDetails extends KanbanCardComment {
  authorName: string | null;
  authorEmail: string | null;
}

export async function listCardComments(cardId: number): Promise<KanbanCardCommentDetails[]> {
  const db = await requireDb();
  const rows = await db
    .select({
      id: kanbanCardComments.id,
      cardId: kanbanCardComments.cardId,
      userId: kanbanCardComments.userId,
      body: kanbanCardComments.body,
      createdAt: kanbanCardComments.createdAt,
      updatedAt: kanbanCardComments.updatedAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(kanbanCardComments)
    .leftJoin(users, eq(users.id, kanbanCardComments.userId))
    .where(eq(kanbanCardComments.cardId, cardId))
    .orderBy(asc(kanbanCardComments.createdAt));

  return rows as KanbanCardCommentDetails[];
}

export async function createCardComment(data: InsertKanbanCardComment) {
  const db = await requireDb();
  const [result] = await db.insert(kanbanCardComments).values(data);
  return { id: Number((result as any).insertId) };
}

export async function deleteCardComment(id: number, requestUserId: number, isAdminBoard: boolean) {
  const db = await requireDb();
  const conditions = isAdminBoard
    ? eq(kanbanCardComments.id, id)
    : and(eq(kanbanCardComments.id, id), eq(kanbanCardComments.userId, requestUserId));
  await db.delete(kanbanCardComments).where(conditions);
}

// ============================================================
// ATTACHMENTS
// ============================================================
export async function listCardAttachments(cardId: number): Promise<KanbanCardAttachment[]> {
  const db = await requireDb();
  return db
    .select()
    .from(kanbanCardAttachments)
    .where(eq(kanbanCardAttachments.cardId, cardId))
    .orderBy(desc(kanbanCardAttachments.createdAt));
}

export async function createCardAttachment(data: InsertKanbanCardAttachment) {
  const db = await requireDb();
  const [result] = await db.insert(kanbanCardAttachments).values(data);
  return { id: Number((result as any).insertId) };
}

export async function deleteCardAttachment(id: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(kanbanCardAttachments)
    .where(eq(kanbanCardAttachments.id, id))
    .limit(1);
  const attachment = rows[0];
  if (!attachment) return null;
  await db.delete(kanbanCardAttachments).where(eq(kanbanCardAttachments.id, id));
  return attachment;
}

export async function getCardAttachmentById(id: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(kanbanCardAttachments)
    .where(eq(kanbanCardAttachments.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ============================================================
// TRASH: restore + hard delete (admin-only on router layer)
// ============================================================

export async function restoreBoard(id: number): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanBoards).set({ archived: false }).where(eq(kanbanBoards.id, id));
}

export async function restoreList(id: number): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanLists).set({ archived: false }).where(eq(kanbanLists.id, id));
}

export async function restoreCard(id: number): Promise<void> {
  const db = await requireDb();
  await db.update(kanbanCards).set({ archived: false }).where(eq(kanbanCards.id, id));
}

async function deleteCardChildren(tx: any, cardIds: number[]): Promise<void> {
  if (cardIds.length === 0) return;
  await tx.delete(kanbanCardAssignees).where(inArray(kanbanCardAssignees.cardId, cardIds));
  await tx.delete(kanbanCardLabels).where(inArray(kanbanCardLabels.cardId, cardIds));
  await tx.delete(kanbanChecklistItems).where(inArray(kanbanChecklistItems.cardId, cardIds));
  await tx.delete(kanbanCardComments).where(inArray(kanbanCardComments.cardId, cardIds));
  await tx.delete(kanbanCardAttachments).where(inArray(kanbanCardAttachments.cardId, cardIds));
}

export async function deleteCardHard(id: number): Promise<void> {
  const db = await requireDb();
  return withDBRetry(
    () =>
      db.transaction(async (tx) => {
        await deleteCardChildren(tx, [id]);
        await tx.delete(kanbanCards).where(eq(kanbanCards.id, id));
      }),
    "kanban.deleteCardHard",
  );
}

export async function deleteListHard(id: number): Promise<void> {
  const db = await requireDb();
  return withDBRetry(
    () =>
      db.transaction(async (tx) => {
        const cards = await tx
          .select({ id: kanbanCards.id })
          .from(kanbanCards)
          .where(eq(kanbanCards.listId, id));
        const cardIds = cards.map((c: { id: number }) => c.id);
        if (cardIds.length > 0) {
          await deleteCardChildren(tx, cardIds);
          await tx.delete(kanbanCards).where(inArray(kanbanCards.id, cardIds));
        }
        await tx.delete(kanbanLists).where(eq(kanbanLists.id, id));
      }),
    "kanban.deleteListHard",
  );
}

export async function deleteBoardHard(id: number): Promise<void> {
  const db = await requireDb();
  return withDBRetry(
    () =>
      db.transaction(async (tx) => {
        const cards = await tx
          .select({ id: kanbanCards.id })
          .from(kanbanCards)
          .where(eq(kanbanCards.boardId, id));
        const cardIds = cards.map((c: { id: number }) => c.id);
        if (cardIds.length > 0) {
          await deleteCardChildren(tx, cardIds);
          await tx.delete(kanbanCards).where(inArray(kanbanCards.id, cardIds));
        }
        await tx.delete(kanbanLists).where(eq(kanbanLists.boardId, id));
        await tx.delete(kanbanLabels).where(eq(kanbanLabels.boardId, id));
        await tx.delete(kanbanBoardMembers).where(eq(kanbanBoardMembers.boardId, id));
        await tx.delete(kanbanBoards).where(eq(kanbanBoards.id, id));
      }),
    "kanban.deleteBoardHard",
  );
}

export async function listCardsAcrossUserBoards(userId: number, userRole?: string) {
  const isPrivileged = userRole === "admin" || userRole === "gestor";
  const boards = await listBoardsForUser(userId, userRole);
  const boardIds = boards.map((b) => b.id);
  if (boardIds.length === 0) {
    return {
      cards: [] as Array<
        KanbanCard & { boardName: string; boardColor: string | null; listName: string }
      >,
      labels: [] as Awaited<ReturnType<typeof listCardLabels>>,
      assignees: [] as KanbanAssigneeDetails[],
      checklistCounts: [] as ChecklistCounts[],
      boards: [] as Array<{ id: number; name: string; color: string | null }>,
    };
  }
  const db = await requireDb();

  let cardRows;
  if (isPrivileged) {
    // Admin/gestor sees all cards on their boards
    cardRows = await db
      .select({
        card: kanbanCards,
        boardName: kanbanBoards.name,
        boardColor: kanbanBoards.color,
        listName: kanbanLists.name,
      })
      .from(kanbanCards)
      .innerJoin(kanbanBoards, eq(kanbanBoards.id, kanbanCards.boardId))
      .innerJoin(kanbanLists, eq(kanbanLists.id, kanbanCards.listId))
      .where(and(inArray(kanbanCards.boardId, boardIds), eq(kanbanCards.archived, false)))
      .orderBy(asc(kanbanCards.dueDate));
  } else {
    // Colaborador only sees cards assigned to them
    cardRows = await db
      .selectDistinct({
        card: kanbanCards,
        boardName: kanbanBoards.name,
        boardColor: kanbanBoards.color,
        listName: kanbanLists.name,
      })
      .from(kanbanCards)
      .innerJoin(kanbanBoards, eq(kanbanBoards.id, kanbanCards.boardId))
      .innerJoin(kanbanLists, eq(kanbanLists.id, kanbanCards.listId))
      .innerJoin(kanbanCardAssignees, eq(kanbanCardAssignees.cardId, kanbanCards.id))
      .where(
        and(
          inArray(kanbanCards.boardId, boardIds),
          eq(kanbanCards.archived, false),
          eq(kanbanCardAssignees.userId, userId),
        ),
      )
      .orderBy(asc(kanbanCards.dueDate));
  }

  const cards = cardRows.map((r) => ({
    ...r.card,
    boardName: r.boardName,
    boardColor: r.boardColor,
    listName: r.listName,
  }));

  const cardIds = cards.map((c) => c.id);
  const [labels, assignees, checklistCounts] = await Promise.all([
    listCardLabels(cardIds),
    listCardAssignees(cardIds),
    listChecklistCountsForCards(cardIds),
  ]);

  return {
    cards,
    labels,
    assignees,
    checklistCounts,
    boards: boards.map((b) => ({ id: b.id, name: b.name, color: b.color })),
  };
}

export async function listArchivedCardsByBoard(boardId: number) {
  const db = await requireDb();
  return db
    .select({
      id: kanbanCards.id,
      listId: kanbanCards.listId,
      title: kanbanCards.title,
      updatedAt: kanbanCards.updatedAt,
    })
    .from(kanbanCards)
    .where(and(eq(kanbanCards.boardId, boardId), eq(kanbanCards.archived, true)))
    .orderBy(desc(kanbanCards.updatedAt));
}

export async function listArchivedListsByBoard(boardId: number) {
  const db = await requireDb();
  return db
    .select({
      id: kanbanLists.id,
      name: kanbanLists.name,
      position: kanbanLists.position,
    })
    .from(kanbanLists)
    .where(and(eq(kanbanLists.boardId, boardId), eq(kanbanLists.archived, true)))
    .orderBy(asc(kanbanLists.position));
}
