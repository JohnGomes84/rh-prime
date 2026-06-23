import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import * as kdb from "../modules/kanban/db.js";
import { notifyKanbanCardAssignment, notifyKanbanCardComment, notifyKanbanCardStatusChange } from "../_core/kanban-notifications.js";
import { broadcastNotification } from "../_core/websocket.js";

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

    restore: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.id, "admin");
        await kdb.restoreBoard(input.id);
        return { success: true };
      }),

    deleteHard: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.id, "admin");
        await kdb.deleteBoardHard(input.id);
        return { success: true };
      }),

    listArchived: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        const [cards, lists] = await Promise.all([
          kdb.listArchivedCardsByBoard(input.boardId),
          kdb.listArchivedListsByBoard(input.boardId),
        ]);
        return { cards, lists };
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

    restore: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        await kdb.restoreList(input.id);
        return { success: true };
      }),

    deleteHard: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        await kdb.deleteListHard(input.id);
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
    listAcrossUserBoards: protectedProcedure.query(async ({ ctx }) => {
      return kdb.listCardsAcrossUserBoards(ctx.user!.id, ctx.user!.role as string);
    }),

    listByBoard: protectedProcedure
      .input(z.object({ boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId);
        const cards = await kdb.listCardsByBoard(input.boardId);
        const ids = cards.map((c) => c.id);
        const [labels, assignees, checklistCounts] = await Promise.all([
          kdb.listCardLabels(ids),
          kdb.listCardAssignees(ids),
          kdb.listChecklistCountsForCards(ids),
        ]);
        return { cards, labels, assignees, checklistCounts };
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
          globalStatus: z.enum(["todo", "in_progress", "done"]).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        const { id, boardId: _b, dueDate, ...rest } = input;
        const data: any = { ...rest };
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

        let oldStatus: string | undefined;
        if (input.globalStatus) {
          const existing = await kdb.getCardById(id);
          if (existing) oldStatus = existing.globalStatus ?? "todo";
        }

        await kdb.updateCard(id, data);

        if (input.globalStatus && oldStatus && oldStatus !== input.globalStatus) {
          try {
            const card = await kdb.getCardById(id);
            const board = await kdb.getBoardById(input.boardId);
            if (card && board) {
              const assignees = await kdb.listCardAssignees([id]);
              const notified = new Set<number>();
              const targets = assignees
                .map((a) => a.userId)
                .filter((uid, idx, arr) => arr.indexOf(uid) === idx && uid !== ctx.user!.id);
              for (const uid of targets) notified.add(uid);

              // Also notify the card creator (if not already in targets and not the one who changed)
              if (card.createdBy && card.createdBy !== ctx.user!.id && !notified.has(card.createdBy)) {
                targets.push(card.createdBy);
                notified.add(card.createdBy);
              }

              await Promise.all(
                targets.map((userId) =>
                  notifyKanbanCardStatusChange({
                    userId,
                    cardId: card.id,
                    cardTitle: card.title,
                    boardId: board.id,
                    boardName: board.name,
                    oldStatus: oldStatus!,
                    newStatus: input.globalStatus!,
                    changedByName: ctx.user!.name ?? ctx.user!.email,
                  }),
                ),
              );
            }
          } catch (err) {
            console.warn("[kanban] status change notification failed:", err);
          }
        }

        return { success: true };
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        await kdb.archiveCard(input.id);
        return { success: true };
      }),

    restore: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        await kdb.restoreCard(input.id);
        return { success: true };
      }),

    deleteHard: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "admin");
        await kdb.deleteCardHard(input.id);
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

        const previous = await kdb.listCardAssignees([input.cardId]);
        const previousIds = new Set(previous.map((a) => a.userId));
        const newlyAssigned = input.userIds.filter((id) => !previousIds.has(id));

        await kdb.setCardAssignees(input.cardId, input.userIds);

        if (newlyAssigned.length > 0) {
          const card = await kdb.getCardById(input.cardId);
          const board = await kdb.getBoardById(input.boardId);
          if (card && board) {
            await Promise.all(
              newlyAssigned.map((userId) =>
                notifyKanbanCardAssignment({
                  userId,
                  cardId: card.id,
                  cardTitle: card.title,
                  boardId: board.id,
                  boardName: board.name,
                  dueDate: card.dueDate,
                  triggeredByUserId: ctx.user!.id,
                })
              )
            );
          }
        }

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

    acceptAssignment: protectedProcedure
      .input(z.object({ cardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user!.id;
        const accepted = await kdb.acceptCardAssignment(input.cardId, userId);
        if (!accepted) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Atribuição não encontrada" });
        }

        const card = await kdb.getCardById(input.cardId);
        if (card) {
          const board = await kdb.getBoardById(card.boardId);
          const userName = ctx.user!.name ?? ctx.user!.email ?? "Usuário";
          if (board) {
            const title = `✅ Demanda aceita: ${card.title}`;
            const message = `${userName} aceitou a demanda "${card.title}" no quadro ${board.name}.`;
            const { createNotification } = await import("../db.js");
            await createNotification({
              type: "Geral",
              title,
              message,
              severity: "Info",
              userId: card.createdBy,
            });
            broadcastNotification({
              type: "Geral",
              title,
              message,
              userId: card.createdBy,
            });
            // Email ao criador
            try {
              const { sendEmail } = await import("../integrations/email-service.js");
              const { getUserById } = await import("../db.js");
              const creator = card.createdBy ? await getUserById(card.createdBy) : null;
              if (creator?.email) {
                const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
                await sendEmail({
                  to: creator.email,
                  subject: title,
                  html: `
                    <h2>Demanda aceita</h2>
                    <p>Olá ${esc(creator.name ?? "")},</p>
                    <p><strong>${esc(userName)}</strong> aceitou a demanda <strong>${esc(card.title)}</strong> no quadro <em>${esc(board.name)}</em>.</p>
                    <p>Atenciosamente,<br>RH Prime</p>
                  `,
                });
              }
            } catch { /* email best-effort */ }
          }
        }

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

  // ============================================================
  // COMMENTS
  // ============================================================
  comments: router({
    list: protectedProcedure
      .input(z.object({ cardId: z.number().int().positive(), boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId);
        return kdb.listCardComments(input.cardId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
          boardId: z.number().int().positive(),
          body: z.string().min(1).max(2000),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        const created = await kdb.createCardComment({
          cardId: input.cardId,
          userId: ctx.user!.id,
          body: input.body.trim(),
        });

        // Notifica assignees (exceto autor)
        try {
          const assignees = await kdb.listCardAssignees([input.cardId]);
          const card = await kdb.getCardById(input.cardId);
          const board = await kdb.getBoardById(input.boardId);
          if (card && board) {
            const targets = assignees
              .map((a) => a.userId)
              .filter((id, idx, arr) => arr.indexOf(id) === idx && id !== ctx.user!.id);
            await Promise.all(
              targets.map((userId) =>
                notifyKanbanCardComment({
                  userId,
                  cardId: card.id,
                  cardTitle: card.title,
                  boardId: board.id,
                  boardName: board.name,
                  authorName: ctx.user!.name ?? ctx.user!.email,
                  bodyPreview: input.body.trim().slice(0, 200),
                })
              )
            );
          }
        } catch (err) {
          console.warn("[kanban.comments.create] notify failed:", err);
        }

        return created;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const role = await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId);
        await kdb.deleteCardComment(input.id, ctx.user!.id, role === "admin");
        return { success: true };
      }),
  }),

  // ============================================================
  // ATTACHMENTS
  // ============================================================
  attachments: router({
    list: protectedProcedure
      .input(z.object({ cardId: z.number().int().positive(), boardId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId);
        return kdb.listCardAttachments(input.cardId);
      }),
    register: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
          boardId: z.number().int().positive(),
          fileName: z.string().min(1).max(255),
          fileUrl: z.string().url().max(500),
          pathname: z.string().max(500).optional(),
          contentType: z.string().max(100).optional(),
          sizeBytes: z.number().int().min(0).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        return kdb.createCardAttachment({
          cardId: input.cardId,
          uploadedBy: ctx.user!.id,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          pathname: input.pathname ?? null,
          contentType: input.contentType ?? null,
          sizeBytes: input.sizeBytes ?? null,
        } as any);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), boardId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await assertAccess(ctx.user!.id, ctx.user!.role as string, input.boardId, "editor");
        const removed = await kdb.deleteCardAttachment(input.id);
        return { success: true, removed };
      }),
  }),
});
