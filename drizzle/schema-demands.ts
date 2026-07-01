import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================
// DEMANDS (Gestão de Demandas Operacionais)
// ============================================================
export const demands = mysqlTable(
  "demands",
  {
    id: int("id").autoincrement().primaryKey(),

    // Origem: quem solicitou a demanda
    requesterId: int("requester_id").notNull(),

    // Fluxo de Demandas
    classifierId: int("classifier_id"),
    executorId: int("executor_id"),

    // Conteúdo
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priority: mysqlEnum("priority", ["baixa", "normal", "alta", "urgente"])
      .default("normal")
      .notNull(),
    category: mysqlEnum("category", ["rh_adm", "financeiro", "operacional"])
      .notNull(),

    // Status do Fluxo
    // pendente = criada, esperando Ediani classificar
    // classificada = Ediani classificou e direcionou
    // em_andamento = executor iniciou
    // aguardando_retorno = executor retornou para validação
    // concluida = Ediani validou e entregou
    // cancelada = cancelada
    status: mysqlEnum("status", [
      "pendente",
      "classificada",
      "em_andamento",
      "aguardando_retorno",
      "concluida",
      "cancelada",
    ])
      .default("pendente")
      .notNull(),

    // Datas de transição
    dueDate: date("due_date").notNull(),
    classifiedAt: timestamp("classified_at"),
    startedAt: timestamp("started_at"),
    returnedAt: timestamp("returned_at"),
    completedAt: timestamp("completed_at"),
    wasOnTime: boolean("was_on_time"),

    // Observações por fase
    classificationNotes: text("classification_notes"),
    returnNotes: text("return_notes"),
    completionNotes: text("completion_notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    requesterIdx: index("idx_demands_requester").on(table.requesterId),
    classifierIdx: index("idx_demands_classifier").on(table.classifierId),
    executorIdx: index("idx_demands_executor").on(table.executorId),
    statusIdx: index("idx_demands_status").on(table.status),
    categoryIdx: index("idx_demands_category").on(table.category),
    priorityIdx: index("idx_demands_priority").on(table.priority),
  }),
);

export type Demand = typeof demands.$inferSelect;
export type InsertDemand = typeof demands.$inferInsert;

// ============================================================
// DEMAND_ATTACHMENTS (Anexos de Demandas)
// ============================================================
export const demandAttachments = mysqlTable(
  "demand_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    demandId: int("demand_id").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: varchar("file_url", { length: 1024 }).notNull(), // Vercel Blob URL
    uploadedById: int("uploaded_by_id").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => ({
    demandIdx: index("idx_attachments_demand").on(table.demandId),
    uploadedByIdx: index("idx_attachments_uploaded_by").on(table.uploadedById),
  }),
);

export type DemandAttachment = typeof demandAttachments.$inferSelect;
export type InsertDemandAttachment = typeof demandAttachments.$inferInsert;
