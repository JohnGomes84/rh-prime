import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  double,
  boolean,
  index,
  primaryKey,
} from "drizzle-orm/mysql-core";

// ============================================================
// KANBAN_BOARDS
// ============================================================
export const kanbanBoards = mysqlTable(
  "kanban_boards",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 16 }).default("#6366f1"),
    ownerId: int("owner_id").notNull(),
    visibility: mysqlEnum("visibility", ["private", "team", "public"]).default("private").notNull(),
    departmentId: int("department_id"),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("idx_kb_owner").on(table.ownerId),
    deptIdx: index("idx_kb_dept").on(table.departmentId),
  }),
);

export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type InsertKanbanBoard = typeof kanbanBoards.$inferInsert;

// ============================================================
// KANBAN_LISTS
// ============================================================
export const kanbanLists = mysqlTable(
  "kanban_lists",
  {
    id: int("id").autoincrement().primaryKey(),
    boardId: int("board_id").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    position: double("position").notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    boardIdx: index("idx_kl_board").on(table.boardId),
    posIdx: index("idx_kl_board_pos").on(table.boardId, table.position),
  }),
);

export type KanbanList = typeof kanbanLists.$inferSelect;
export type InsertKanbanList = typeof kanbanLists.$inferInsert;

// ============================================================
// KANBAN_CARDS
// ============================================================
export const kanbanCards = mysqlTable(
  "kanban_cards",
  {
    id: int("id").autoincrement().primaryKey(),
    listId: int("list_id").notNull(),
    boardId: int("board_id").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    position: double("position").notNull(),
    dueDate: date("due_date"),
    priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
    createdBy: int("created_by").notNull(),
    archived: boolean("archived").default(false).notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    listIdx: index("idx_kc_list").on(table.listId),
    boardIdx: index("idx_kc_board").on(table.boardId),
    posIdx: index("idx_kc_list_pos").on(table.listId, table.position),
  }),
);

export type KanbanCard = typeof kanbanCards.$inferSelect;
export type InsertKanbanCard = typeof kanbanCards.$inferInsert;

// ============================================================
// KANBAN_CHECKLIST_ITEMS
// ============================================================
export const kanbanChecklistItems = mysqlTable(
  "kanban_checklist_items",
  {
    id: int("id").autoincrement().primaryKey(),
    cardId: int("card_id").notNull(),
    content: varchar("content", { length: 255 }).notNull(),
    isDone: boolean("is_done").default(false).notNull(),
    position: double("position").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    cardIdx: index("idx_kci_card").on(table.cardId),
    posIdx: index("idx_kci_card_pos").on(table.cardId, table.position),
  }),
);

export type KanbanChecklistItem = typeof kanbanChecklistItems.$inferSelect;
export type InsertKanbanChecklistItem = typeof kanbanChecklistItems.$inferInsert;

// ============================================================
// KANBAN_CARD_ASSIGNEES
// ============================================================
export const kanbanCardAssignees = mysqlTable(
  "kanban_card_assignees",
  {
    id: int("id").autoincrement().primaryKey(),
    cardId: int("card_id").notNull(),
    userId: int("user_id").notNull(),
    employeeId: int("employee_id"),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => ({
    cardIdx: index("idx_kca_card").on(table.cardId),
    userIdx: index("idx_kca_user").on(table.userId),
    cardUserIdx: index("idx_kca_card_user").on(table.cardId, table.userId),
  }),
);

export type KanbanCardAssignee = typeof kanbanCardAssignees.$inferSelect;
export type InsertKanbanCardAssignee = typeof kanbanCardAssignees.$inferInsert;

// ============================================================
// KANBAN_LABELS
// ============================================================
export const kanbanLabels = mysqlTable(
  "kanban_labels",
  {
    id: int("id").autoincrement().primaryKey(),
    boardId: int("board_id").notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    color: varchar("color", { length: 16 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    boardIdx: index("idx_klbl_board").on(table.boardId),
  }),
);

export type KanbanLabel = typeof kanbanLabels.$inferSelect;
export type InsertKanbanLabel = typeof kanbanLabels.$inferInsert;

// ============================================================
// KANBAN_CARD_LABELS (composite PK)
// ============================================================
export const kanbanCardLabels = mysqlTable(
  "kanban_card_labels",
  {
    cardId: int("card_id").notNull(),
    labelId: int("label_id").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.cardId, table.labelId] }),
    labelIdx: index("idx_kclbl_label").on(table.labelId),
  }),
);

export type KanbanCardLabel = typeof kanbanCardLabels.$inferSelect;
export type InsertKanbanCardLabel = typeof kanbanCardLabels.$inferInsert;

// ============================================================
// KANBAN_BOARD_MEMBERS
// ============================================================
export const kanbanBoardMembers = mysqlTable(
  "kanban_board_members",
  {
    id: int("id").autoincrement().primaryKey(),
    boardId: int("board_id").notNull(),
    userId: int("user_id").notNull(),
    role: mysqlEnum("role", ["admin", "editor", "viewer"]).default("editor").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => ({
    boardUserIdx: index("idx_kbm_board_user").on(table.boardId, table.userId),
    userIdx: index("idx_kbm_user").on(table.userId),
  }),
);

export type KanbanBoardMember = typeof kanbanBoardMembers.$inferSelect;
export type InsertKanbanBoardMember = typeof kanbanBoardMembers.$inferInsert;


// ============================================================
// KANBAN_CARD_COMMENTS
// ============================================================
export const kanbanCardComments = mysqlTable(
  "kanban_card_comments",
  {
    id: int("id").autoincrement().primaryKey(),
    cardId: int("card_id").notNull(),
    userId: int("user_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    cardCreatedIdx: index("idx_kcc_card_created").on(table.cardId, table.createdAt),
  }),
);

export type KanbanCardComment = typeof kanbanCardComments.$inferSelect;
export type InsertKanbanCardComment = typeof kanbanCardComments.$inferInsert;

// ============================================================
// KANBAN_CARD_ATTACHMENTS
// ============================================================
export const kanbanCardAttachments = mysqlTable(
  "kanban_card_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    cardId: int("card_id").notNull(),
    uploadedBy: int("uploaded_by").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: varchar("file_url", { length: 500 }).notNull(),
    pathname: varchar("pathname", { length: 500 }),
    contentType: varchar("content_type", { length: 100 }),
    sizeBytes: int("size_bytes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    cardIdx: index("idx_kca_card").on(table.cardId, table.createdAt),
  }),
);

export type KanbanCardAttachment = typeof kanbanCardAttachments.$inferSelect;
export type InsertKanbanCardAttachment = typeof kanbanCardAttachments.$inferInsert;
