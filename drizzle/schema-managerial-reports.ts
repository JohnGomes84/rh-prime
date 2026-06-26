import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  boolean,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================
// MR_REPORTS (Relatórios Gerenciais — uma entrega por período)
// ============================================================
export const mrReports = mysqlTable(
  "mr_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    templateKey: varchar("template_key", { length: 48 }).notNull(),
    sector: mysqlEnum("sector", ["rh_admin", "financeiro"]).notNull(),
    cadence: mysqlEnum("cadence", ["semanal", "mensal"]).notNull(),
    periodRef: varchar("period_ref", { length: 10 }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    authorId: int("author_id").notNull(),
    status: mysqlEnum("status", ["rascunho", "enviado", "validado", "devolvido"])
      .default("rascunho")
      .notNull(),
    wasOnTime: boolean("was_on_time"),
    summary: text("summary"),
    pointsForValidator: text("points_for_validator"),
    nextPriorities: text("next_priorities"),
    submittedAt: timestamp("submitted_at"),
    validatedAt: timestamp("validated_at"),
    validatedBy: int("validated_by"),
    rejectionNote: text("rejection_note"),
    lockedSnapshot: json("locked_snapshot"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    periodUnique: uniqueIndex("uq_mr_reports_period").on(
      table.sector,
      table.cadence,
      table.periodRef,
    ),
    authorIdx: index("idx_mr_reports_author").on(table.authorId),
    statusIdx: index("idx_mr_reports_status").on(table.status),
  }),
);

export type MrReport = typeof mrReports.$inferSelect;
export type InsertMrReport = typeof mrReports.$inferInsert;

// ============================================================
// MR_REPORT_ITEMS (Itens estruturados de cada relatório)
// ============================================================
export const mrReportItems = mysqlTable(
  "mr_report_items",
  {
    id: int("id").autoincrement().primaryKey(),
    reportId: int("report_id").notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    expectedContent: text("expected_content"),
    value: text("value"),
    itemStatus: mysqlEnum("item_status", ["pendente", "em_andamento", "concluido"])
      .default("pendente")
      .notNull(),
    carriedOver: boolean("carried_over").default(false).notNull(),
    sortOrder: int("sort_order").default(0).notNull(),
  },
  (table) => ({
    reportIdx: index("idx_mr_items_report").on(table.reportId),
  }),
);

export type MrReportItem = typeof mrReportItems.$inferSelect;
export type InsertMrReportItem = typeof mrReportItems.$inferInsert;
