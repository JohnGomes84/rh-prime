import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  date,
} from "drizzle-orm/mysql-core";

export const operationalClients = mysqlTable(
  "operational_clients",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    notes: text("notes"),
    createdBy: int("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_op_clients_name").on(table.name),
    statusIdx: index("idx_op_clients_status").on(table.status),
  }),
);

export const operationalRoutines = mysqlTable(
  "operational_routines",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    area: mysqlEnum("area", ["financeiro", "rh", "operacional", "administrativo"])
      .default("financeiro")
      .notNull(),
    routineType: mysqlEnum("routine_type", [
      "medicao",
      "nota_fiscal",
      "envio_boleto",
      "cobranca_retorno",
      "lancamento",
      "pagamento_operacional",
      "conferencia_baixa",
      "fechamento",
      "outro",
    ]).notNull(),
    frequency: mysqlEnum("frequency", ["weekly", "biweekly", "monthly"]).default("monthly").notNull(),
    dayOfWeek: int("day_of_week"),
    dayOfMonth: int("day_of_month"),
    generateLeadDays: int("generate_lead_days").default(7).notNull(),
    reminderDays: json("reminder_days").notNull(),
    overdueReminderEnabled: boolean("overdue_reminder_enabled").default(true).notNull(),
    assigneeUserId: int("assignee_user_id"),
    boardId: int("board_id"),
    listId: int("list_id"),
    priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
    requiresReview: boolean("requires_review").default(false).notNull(),
    checklistTemplate: json("checklist_template").notNull(),
    instructions: text("instructions"),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: int("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    clientIdx: index("idx_op_routines_client").on(table.clientId),
    activeIdx: index("idx_op_routines_active").on(table.isActive),
    assigneeIdx: index("idx_op_routines_assignee").on(table.assigneeUserId),
  }),
);

export const operationalRoutineOccurrences = mysqlTable(
  "operational_routine_occurrences",
  {
    id: int("id").autoincrement().primaryKey(),
    routineId: int("routine_id").notNull(),
    clientId: int("client_id").notNull(),
    periodRef: varchar("period_ref", { length: 20 }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    cardId: int("card_id"),
    status: mysqlEnum("status", [
      "pending",
      "in_progress",
      "waiting_return",
      "waiting_review",
      "done",
      "overdue",
      "not_applicable",
    ]).default("pending").notNull(),
    nextAction: varchar("next_action", { length: 255 }),
    operationalNotes: text("operational_notes"),
    completedAt: timestamp("completed_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: int("reviewed_by"),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    routinePeriodUnique: uniqueIndex("uq_op_occ_routine_period").on(table.routineId, table.periodRef),
    routineIdx: index("idx_op_occ_routine").on(table.routineId),
    clientIdx: index("idx_op_occ_client").on(table.clientId),
    dueIdx: index("idx_op_occ_due").on(table.dueDate),
    cardIdx: index("idx_op_occ_card").on(table.cardId),
    statusIdx: index("idx_op_occ_status").on(table.status),
  }),
);

export const operationalRoutineReminders = mysqlTable(
  "operational_routine_reminders",
  {
    id: int("id").autoincrement().primaryKey(),
    occurrenceId: int("occurrence_id").notNull(),
    reminderKey: varchar("reminder_key", { length: 40 }).notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (table) => ({
    occurrenceKeyUnique: uniqueIndex("uq_op_rem_occ_key").on(table.occurrenceId, table.reminderKey),
    occurrenceIdx: index("idx_op_rem_occ").on(table.occurrenceId),
  }),
);

export type OperationalClient = typeof operationalClients.$inferSelect;
export type InsertOperationalClient = typeof operationalClients.$inferInsert;
export type OperationalRoutine = typeof operationalRoutines.$inferSelect;
export type InsertOperationalRoutine = typeof operationalRoutines.$inferInsert;
export type OperationalRoutineOccurrence = typeof operationalRoutineOccurrences.$inferSelect;
export type InsertOperationalRoutineOccurrence = typeof operationalRoutineOccurrences.$inferInsert;
export type OperationalRoutineReminder = typeof operationalRoutineReminders.$inferSelect;
export type InsertOperationalRoutineReminder = typeof operationalRoutineReminders.$inferInsert;
