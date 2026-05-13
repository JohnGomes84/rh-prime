import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import * as kdb from "../modules/kanban/db.js";

async function assertAccess(
  userId: number,
  userRole: string | undefined,
  boardId: number,
  minRole: kdb.BoardAccessRole = "viewer",
): Promise<kdb.BoardAccessRole> {
  const role = await kdb.getUserBoardRole(userId, boardId, userRole);
  if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Sem acesso a este board" });
  const ranks: Record<kdb.BoardAccessRole, number> = { viewer: 1, editor: 2, admin: 3 };
  if (ranks[role] < ranks[minRole]) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Permissão insuficiente para esta ação" });
  }
  return role;
}

const visibilityEnum = z.enum(["private", "team", "public"]);
const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);
const memberRoleEnum = z.enum(["admin", "editor", "viewer"]);

export const kanbanRouter = router({
  // ============================================================
  // BOARDS
  // ============================================================
  boards: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return kdb.listBoardsForUser(ctx.user!.id, ctx.user!.role as string);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const role = await assertAccess(ctx.user!.id, ctx.user!.role as string, input.id);
        const board = await kdb.getBoardById(input.id);
        if (!board) throw new TRPCError({ code: "NOT_FOUND", message: "Board não encontrado" });
        return { ...board, viewerRole: role };
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(120),
          description: z.string().max(2000).optional(),
          color: z.string().max(16).optional(),
          visibility: visibilityEnum.default("private"),
          departmentId: z.number().int().positive().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (input.visibility === "team" && !input.departmentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Boards de departamento exigem um departamento vinculado",
          });
        }
        const result = await kdb.createBoard({
          name: input.name,
          description: input.description ?? null,
          color: input.color ?? "#6366f1",
          visibility: input.visibility,
          departmentId: input.departmentId ?? null,
          ownerId: ctx.user!.id,
        } as any);
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(1).max(120).optional(),
          description: z.string().max(2000).optional(),
          color: z.string().max(16).optional(),
          visibility: visibilityEnum.optional(),
          departmentId: z.number().int().positive().nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.id, "admin");
        if (input.visibility === "team" && !input.departmentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Boards de departamento exigem um departamento vinculado",
          });
        }
        const { id, ...data } = input;
        await kdb.updateBoard(id, data as any);
        return { success: true };
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.id, "admin");
        await kdb.archiveBoard(input.id);
        return { success: true };
      }),

    listMembers: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId);
        return kdb.listBoardMembers(input.boardId);
      }),

    listUserCandidates: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        return kdb.listBoardUserCandidates(input.boardId);
      }),

    addMember: protectedProcedure
      .input(
        z.object({
          boardId: z.number().int().positive(),
          userId: z.number().int().positive(),
          role: memberRoleEnum.default("editor"),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        return kdb.addBoardMember(input.boardId, input.userId, input.role);
      }),

    removeMember: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive(), userId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        await kdb.removeBoardMember(input.boardId, input.userId);
        return { success: true };
      }),
  }),

  // ============================================================
  // LISTS
  // ============================================================
  lists: router({
    listByBoard: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId);
        return kdb.listListsByBoard(input.boardId);
      }),

    create: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive(), name: z.string().min(1).max(80) }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        return kdb.createList(input.boardId, input.name);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          boardId: z.number().int().positive(),
          name: z.string().min(1).max(80).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        const { id, boardId: _b, ...data } = input;
        await kdb.updateList(id, data as any);
        return { success: true };
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        await kdb.archiveList(input.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(
        z.object({
          boardId: z.number().int().positive(),
          orderedIds: z.array(z.number().int().positive()).min(1).max(50),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        await kdb.reorderLists(input.boardId, input.orderedIds);
        return { success: true };
      }),
  }),

  // ============================================================
  // CARDS
  // ============================================================
  cards: router({
    listByBoard: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId);
        const cards = await kdb.listCardsByBoard(input.boardId);
        const ids = cards.map((c) => c.id);
        const [labels, assignees] = await Promise.all([
          kdb.listCardLabels(ids),
          kdb.listCardAssignees(ids),
        ]);
        return { cards, labels, assignees };
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const card = await kdb.getCardById(input.id);
        if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Card não encontrado" });
        await assertAccess(ctx.user!.id, ctx.user!.role as string, card.boardId);
        const [labels, assignees, checklist] = await Promise.all([
          kdb.listCardLabels([card.id]),
          kdb.listCardAssignees([card.id]),
          kdb.listChecklistItems(card.id),
        ]);
        return { card, labels, assignees, checklist };
      }),

    create: protectedProcedure
      .input(
        z.object({
          listId: z.number().int().positive(),
          boardId: z.number().int().positive(),
          title: z.string().min(1).max(200),
          description: z.string().max(10000).optional(),
          priority: priorityEnum.optional(),
          dueDate: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        return kdb.createCard({
          listId: input.listId,
          boardId: input.boardId,
          title: input.title,
          description: input.description ?? null,
          createdBy: ctx.user!.id,
          priority: input.priority,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          boardId: z.number().int().positive(),
          title: z.string().min(1).max(200).optional(),
          description: z.string().max(10000).nullable().optional(),
          priority: priorityEnum.optional(),
          dueDate: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        const { id, boardId: _b, dueDate, ...rest } = input;
        const data: any = { ...rest };
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
        await kdb.updateCard(id, data);
        return { success: true };
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        await kdb.archiveCard(input.id);
        return { success: true };
      }),

    move: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
          boardId: z.number().int().positive(),
          toListId: z.number().int().positive(),
          toIndex: z.number().int().min(0),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        return kdb.moveCard({
          cardId: input.cardId,
          toListId: input.toListId,
          toIndex: input.toIndex,
        });
      }),

    setAssignees: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
          boardId: z.number().int().positive(),
          userIds: z.array(z.number().int().positive()).max(20),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        await kdb.setCardAssignees(input.cardId, input.userIds);
        return { success: true };
      }),

    setLabels: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
          boardId: z.number().int().positive(),
          labelIds: z.array(z.number().int().positive()).max(20),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        await kdb.setCardLabels(input.cardId, input.labelIds);
        return { success: true };
      }),
  }),

  // ============================================================
  // LABELS
  // ============================================================
  labels: router({
    listByBoard: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId);
        return kdb.listLabelsByBoard(input.boardId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          boardId: z.number().int().positive(),
          name: z.string().min(1).max(40),
          color: z.string().min(1).max(16),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        return kdb.createLabel(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          boardId: z.number().int().positive(),
          name: z.string().min(1).max(40).optional(),
          color: z.string().min(1).max(16).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        const { id, boardId: _b, ...data } = input;
        await kdb.updateLabel(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        await kdb.deleteLabel(input.id);
        return { success: true };
      }),
  }),

  // ============================================================
  // CHECKLIST
  // ============================================================
  checklist: router({
    create: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
          boardId: z.number().int().positive(),
          content: z.string().min(1).max(255),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        return kdb.createChecklistItem(input.cardId, input.content.trim());
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          boardId: z.number().int().positive(),
          content: z.string().min(1).max(255).optional(),
          isDone: z.boolean().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        const { id, boardId: _b, ...data } = input;
        await kdb.updateChecklistItem(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          boardId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        await kdb.deleteChecklistItem(input.id);
        return { success: true };
      }),
  }),
});
