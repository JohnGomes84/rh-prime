import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock kanban DB module before importing appRouter
vi.mock("../modules/kanban/db", () => {
  const state = {
    boards: new Map<number, any>(),
    lists: new Map<number, any>(),
    cards: new Map<number, any>(),
    checklist: new Map<number, any>(),
    members: new Map<string, any>(),
    userDepartments: new Map<number, number | null>([
      [1, 10],
      [2, 10],
      [3, 20],
    ]),
    nextBoardId: 1,
    nextListId: 1,
    nextCardId: 1,
    nextChecklistId: 1,
  };

  return {
    state,
    async getUserBoardRole(userId: number, boardId: number, userRole?: string) {
      if (userRole === "admin") return "admin";
      const board = state.boards.get(boardId);
      if (!board) return null;
      if (board.ownerId === userId) return "admin";
      if (board.visibility === "public") return "viewer";
      if (board.visibility === "team" && board.departmentId && state.userDepartments.get(userId) === board.departmentId) {
        return "viewer";
      }
      const m = state.members.get(`${boardId}:${userId}`);
      return m ? m.role : null;
    },
    async listBoardsForUser(userId: number, userRole?: string) {
      if (userRole === "admin") return Array.from(state.boards.values());
      return Array.from(state.boards.values()).filter((b) => {
        if (b.ownerId === userId) return true;
        if (b.visibility === "public") return true;
        if (b.visibility === "team" && b.departmentId && state.userDepartments.get(userId) === b.departmentId) return true;
        return state.members.has(`${b.id}:${userId}`);
      });
    },
    async getBoardById(id: number) {
      return state.boards.get(id) ?? null;
    },
    async createBoard(data: any) {
      const id = state.nextBoardId++;
      state.boards.set(id, { id, ...data, archived: false, updatedAt: new Date() });
      return { id };
    },
    async updateBoard(id: number, data: any) {
      const b = state.boards.get(id);
      if (b) Object.assign(b, data);
    },
    async archiveBoard(id: number) {
      const b = state.boards.get(id);
      if (b) b.archived = true;
    },
    async listBoardMembers(boardId: number) {
      return Array.from(state.members.values()).filter((m) => m.boardId === boardId);
    },
    async listBoardUserCandidates() {
      return [
        { userId: 1, userName: "U1", userEmail: "u1@test.com", employeeId: 1, employeeName: "U1", departmentId: 10 },
        { userId: 2, userName: "U2", userEmail: "u2@test.com", employeeId: 2, employeeName: "U2", departmentId: 10 },
        { userId: 3, userName: "U3", userEmail: "u3@test.com", employeeId: 3, employeeName: "U3", departmentId: 20 },
      ];
    },
    async addBoardMember(boardId: number, userId: number, role: string) {
      const id = state.members.size + 1;
      state.members.set(`${boardId}:${userId}`, { id, boardId, userId, role });
      return { id };
    },
    async removeBoardMember(boardId: number, userId: number) {
      state.members.delete(`${boardId}:${userId}`);
    },
    async listListsByBoard(boardId: number) {
      return Array.from(state.lists.values())
        .filter((l) => l.boardId === boardId && !l.archived)
        .sort((a, b) => a.position - b.position);
    },
    async createList(boardId: number, name: string) {
      const id = state.nextListId++;
      const position = state.lists.size * 1024 + 1024;
      state.lists.set(id, { id, boardId, name, position, archived: false });
      return { id, position };
    },
    async updateList(id: number, data: any) {
      const l = state.lists.get(id);
      if (l) Object.assign(l, data);
    },
    async archiveList(id: number) {
      const l = state.lists.get(id);
      if (l) l.archived = true;
    },
    async reorderLists(boardId: number, orderedIds: number[]) {
      orderedIds.forEach((id, i) => {
        const l = state.lists.get(id);
        if (l && l.boardId === boardId) l.position = (i + 1) * 1024;
      });
    },
    async listCardsByBoard(boardId: number) {
      return Array.from(state.cards.values()).filter((c) => c.boardId === boardId && !c.archived);
    },
    async getCardById(id: number) {
      return state.cards.get(id) ?? null;
    },
    async createCard(input: any) {
      const id = state.nextCardId++;
      const position = state.cards.size * 1024 + 1024;
      const card = {
        id,
        listId: input.listId,
        boardId: input.boardId,
        title: input.title,
        description: input.description ?? null,
        position,
        priority: input.priority ?? "medium",
        dueDate: input.dueDate ?? null,
        createdBy: input.createdBy,
        archived: false,
      };
      state.cards.set(id, card);
      return { id, position };
    },
    async updateCard(id: number, data: any) {
      const c = state.cards.get(id);
      if (c) Object.assign(c, data);
    },
    async archiveCard(id: number) {
      const c = state.cards.get(id);
      if (c) c.archived = true;
    },
    async listChecklistItems(cardId: number) {
      return Array.from(state.checklist.values())
        .filter((item) => item.cardId === cardId)
        .sort((a, b) => a.position - b.position);
    },
    async createChecklistItem(cardId: number, content: string) {
      const id = state.nextChecklistId++;
      const position = state.checklist.size * 1024 + 1024;
      state.checklist.set(id, {
        id,
        cardId,
        content,
        isDone: false,
        position,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id, position };
    },
    async updateChecklistItem(id: number, data: any) {
      const item = state.checklist.get(id);
      if (item) Object.assign(item, data);
    },
    async deleteChecklistItem(id: number) {
      state.checklist.delete(id);
    },
    async moveCard(args: { cardId: number; toListId: number; toIndex: number }) {
      const c = state.cards.get(args.cardId);
      if (!c) throw new Error("Card not found");
      c.listId = args.toListId;
      const siblings = Array.from(state.cards.values())
        .filter((x) => x.listId === args.toListId && x.id !== args.cardId && !x.archived)
        .sort((a, b) => a.position - b.position);
      const idx = Math.max(0, Math.min(args.toIndex, siblings.length));
      let newPos: number;
      if (siblings.length === 0) newPos = 1024;
      else if (idx === 0) newPos = siblings[0]!.position - 1024;
      else if (idx >= siblings.length) newPos = siblings[siblings.length - 1]!.position + 1024;
      else newPos = (siblings[idx - 1]!.position + siblings[idx]!.position) / 2;
      c.position = newPos;
      return { position: newPos };
    },
    async listLabelsByBoard() {
      return [];
    },
    async createLabel(data: any) {
      return { id: 1, ...data };
    },
    async updateLabel() {},
    async deleteLabel() {},
    async setCardLabels() {},
    async listCardLabels() {
      return [];
    },
    async setCardAssignees() {},
    async listCardAssignees() {
      return [];
    },
  };
});

import { appRouter } from "../routers.js";
import * as kdbMock from "../modules/kanban/db.js";

const mockState = (kdbMock as any).state as {
  boards: Map<number, any>;
  lists: Map<number, any>;
  cards: Map<number, any>;
  checklist: Map<number, any>;
  members: Map<string, any>;
  userDepartments: Map<number, number | null>;
  nextBoardId: number;
  nextListId: number;
  nextCardId: number;
  nextChecklistId: number;
};

function makeContext(user: { id: number; role: string; email?: string }) {
  return {
    user: { id: user.id, email: user.email ?? `u${user.id}@test.com`, name: `U${user.id}`, role: user.role, cpf: "00000000000" },
    req: { headers: {}, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } },
    res: { setHeader: () => {}, clearCookie: () => {}, cookie: () => {} },
  } as any;
}

describe("Kanban Router", () => {
  beforeEach(() => {
    mockState.boards.clear();
    mockState.lists.clear();
    mockState.cards.clear();
    mockState.checklist.clear();
    mockState.members.clear();
    mockState.userDepartments = new Map<number, number | null>([
      [1, 10],
      [2, 10],
      [3, 20],
    ]);
    mockState.nextBoardId = 1;
    mockState.nextListId = 1;
    mockState.nextCardId = 1;
    mockState.nextChecklistId = 1;
  });

  it("owner sees own board; non-member does not see private board", async () => {
    const owner = appRouter.createCaller(makeContext({ id: 1, role: "gestor" }));
    const stranger = appRouter.createCaller(makeContext({ id: 2, role: "gestor" }));

    const board = await owner.kanban.boards.create({
      name: "Tarefas",
      visibility: "private",
    });

    const ownerList = await owner.kanban.boards.list();
    expect(ownerList.find((b) => b.id === board.id)).toBeTruthy();

    const strangerList = await stranger.kanban.boards.list();
    expect(strangerList.find((b) => b.id === board.id)).toBeFalsy();

    await expect(stranger.kanban.boards.get({ id: board.id })).rejects.toThrow(/acesso/i);
  });

  it("moveCard atomically updates listId and position", async () => {
    const owner = appRouter.createCaller(makeContext({ id: 1, role: "gestor" }));
    const board = await owner.kanban.boards.create({ name: "B", visibility: "private" });
    const listA = await owner.kanban.lists.create({ boardId: board.id, name: "A" });
    const listB = await owner.kanban.lists.create({ boardId: board.id, name: "B" });
    const card = await owner.kanban.cards.create({
      listId: listA.id,
      boardId: board.id,
      title: "Card X",
    });

    const result = await owner.kanban.cards.move({
      cardId: card.id,
      boardId: board.id,
      toListId: listB.id,
      toIndex: 0,
    });

    expect(result.position).toBeDefined();
    const movedCard = mockState.cards.get(card.id);
    expect(movedCard.listId).toBe(listB.id);
    expect(movedCard.position).toBe(result.position);
  });

  it("reorderLists updates positions in given order", async () => {
    const owner = appRouter.createCaller(makeContext({ id: 1, role: "gestor" }));
    const board = await owner.kanban.boards.create({ name: "B", visibility: "private" });
    const l1 = await owner.kanban.lists.create({ boardId: board.id, name: "A" });
    const l2 = await owner.kanban.lists.create({ boardId: board.id, name: "B" });
    const l3 = await owner.kanban.lists.create({ boardId: board.id, name: "C" });

    await owner.kanban.lists.reorder({
      boardId: board.id,
      orderedIds: [l3.id, l1.id, l2.id],
    });

    const lists = await owner.kanban.lists.listByBoard({ boardId: board.id });
    expect(lists.map((l) => l.id)).toEqual([l3.id, l1.id, l2.id]);
  });

  it("non-member cannot create card in private board", async () => {
    const owner = appRouter.createCaller(makeContext({ id: 1, role: "gestor" }));
    const stranger = appRouter.createCaller(makeContext({ id: 2, role: "gestor" }));

    const board = await owner.kanban.boards.create({ name: "Secret", visibility: "private" });
    const list = await owner.kanban.lists.create({ boardId: board.id, name: "TODO" });

    await expect(
      stranger.kanban.cards.create({
        listId: list.id,
        boardId: board.id,
        title: "Sneak",
      }),
    ).rejects.toThrow(/acesso/i);
  });

  it("public board allows non-member view but blocks edits", async () => {
    const owner = appRouter.createCaller(makeContext({ id: 1, role: "gestor" }));
    const other = appRouter.createCaller(makeContext({ id: 2, role: "gestor" }));

    const board = await owner.kanban.boards.create({ name: "Open", visibility: "public" });
    const list = await owner.kanban.lists.create({ boardId: board.id, name: "TODO" });

    const visible = await other.kanban.boards.get({ id: board.id });
    expect(visible.viewerRole).toBe("viewer");

    await expect(
      other.kanban.cards.create({
        listId: list.id,
        boardId: board.id,
        title: "Hi",
      }),
    ).rejects.toThrow(/permiss/i);
  });

  it("team board allows same-department view but blocks edits without membership", async () => {
    const owner = appRouter.createCaller(makeContext({ id: 1, role: "gestor" }));
    const sameDepartment = appRouter.createCaller(makeContext({ id: 2, role: "gestor" }));
    const otherDepartment = appRouter.createCaller(makeContext({ id: 3, role: "gestor" }));

    const board = await owner.kanban.boards.create({
      name: "Dept",
      visibility: "team",
      departmentId: 10,
    });
    const list = await owner.kanban.lists.create({ boardId: board.id, name: "TODO" });

    const visible = await sameDepartment.kanban.boards.get({ id: board.id });
    expect(visible.viewerRole).toBe("viewer");

    await expect(
      sameDepartment.kanban.cards.create({
        listId: list.id,
        boardId: board.id,
        title: "Blocked",
      }),
    ).rejects.toThrow(/permiss/i);

    await expect(otherDepartment.kanban.boards.get({ id: board.id })).rejects.toThrow(/acesso/i);
  });

  it("editor can create and update checklist items on a card", async () => {
    const owner = appRouter.createCaller(makeContext({ id: 1, role: "gestor" }));
    const board = await owner.kanban.boards.create({ name: "Checklist", visibility: "private" });
    const list = await owner.kanban.lists.create({ boardId: board.id, name: "TODO" });
    const card = await owner.kanban.cards.create({
      listId: list.id,
      boardId: board.id,
      title: "Card with checklist",
    });

    const item = await owner.kanban.checklist.create({
      cardId: card.id,
      boardId: board.id,
      content: "Validar documentos",
    });

    await owner.kanban.checklist.update({
      id: item.id,
      boardId: board.id,
      isDone: true,
    });

    const detail = await owner.kanban.cards.get({ id: card.id });
    expect(detail.checklist).toHaveLength(1);
    expect(detail.checklist[0]?.content).toBe("Validar documentos");
    expect(detail.checklist[0]?.isDone).toBe(true);
  });
});
