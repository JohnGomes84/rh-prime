import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
  longtext,
  time,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================
// AUTH - Tabela de usuários do sistema (OAuth)
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "leader"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// CADASTROS - Entidades base do negócio
// ============================================================

/** Funcionários / Diaristas */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).unique(), // 000.000.000-00
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  city: varchar("city", { length: 100 }),
  pixKey: varchar("pixKey", { length: 255 }), // Chave PIX (CPF, email, telefone, aleatória)
  pixKeyType: mysqlEnum("pixKeyType", ["cpf", "email", "phone", "random", "cnpj"]),
  rg: varchar("rg", { length: 30 }),
  docFrontUrl: text("docFrontUrl"), // Foto documento frente (S3)
  docBackUrl: text("docBackUrl"), // Foto documento verso (S3)
  status: mysqlEnum("status", ["diarista", "inativo", "pendente"]).default("diarista").notNull(),
  registrationDate: datetime("registrationDate"), // Data de cadastro do diarista
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/** Clientes (Empresas de logística) */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  city: varchar("city", { length: 100 }),
  address: varchar("address", { length: 500 }),
  contactName: varchar("contactName", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/** Unidades / Locais dentro do cliente */
export const clientUnits = mysqlTable("client_units", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // ex: Sorotama, Base, Dufrio, RG
  address: varchar("address", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientUnit = typeof clientUnits.$inferSelect;
export type InsertClientUnit = typeof clientUnits.$inferInsert;

/** Funções e Salários (Aux. Carga e Descarga, Líder, etc.) */
export const jobFunctions = mysqlTable("job_functions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ex: Aux. Carga e Descarga
  defaultPayValue: decimal("defaultPayValue", { precision: 10, scale: 2 }), // Valor padrão que paga ao diarista
  defaultReceiveValue: decimal("defaultReceiveValue", { precision: 10, scale: 2 }), // Valor padrão que recebe do cliente
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobFunction = typeof jobFunctions.$inferSelect;
export type InsertJobFunction = typeof jobFunctions.$inferInsert;

/** Funções associadas a cada Cliente (com valores específicos) */
export const clientFunctions = mysqlTable("client_functions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  jobFunctionId: int("jobFunctionId").notNull(),
  payValue: decimal("payValue", { precision: 10, scale: 2 }), // Valor que paga ao diarista neste cliente
  receiveValue: decimal("receiveValue", { precision: 10, scale: 2 }), // Valor que recebe do cliente
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientFunction = typeof clientFunctions.$inferSelect;
export type InsertClientFunction = typeof clientFunctions.$inferInsert;

/** Turnos de trabalho (MLT-1 a MLT-13) */
export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // ex: MLT-1, MLT-2
  startTime: time("startTime").notNull(), // 06:00
  endTime: time("endTime").notNull(), // 15:00
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

/** Centros de Custo */
export const costCenters = mysqlTable("cost_centers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = typeof costCenters.$inferInsert;

/** Fornecedores */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  city: varchar("city", { length: 100 }),
  pixKey: varchar("pixKey", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ============================================================
// FINANCEIRO - Contas a Pagar e Receber
// ============================================================

/** Contas Bancárias da empresa */
export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  bankName: varchar("bankName", { length: 100 }),
  accountNumber: varchar("accountNumber", { length: 50 }),
  agency: varchar("agency", { length: 20 }),
  accountType: mysqlEnum("accountType", ["checking", "savings", "investment"]).default("checking"),
  initialBalance: decimal("initialBalance", { precision: 15, scale: 2 }).default("0"),
  currentBalance: decimal("currentBalance", { precision: 15, scale: 2 }).default("0"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

/** Contas a Pagar */
export const accountsPayable = mysqlTable("accounts_payable", {
  id: int("id").autoincrement().primaryKey(),
  description: varchar("description", { length: 255 }).notNull(),
  supplierId: int("supplierId"),
  clientId: int("clientId"),
  costCenterId: int("costCenterId"),
  bankAccountId: int("bankAccountId"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: datetime("dueDate").notNull(),
  paymentDate: datetime("paymentDate"),
  status: mysqlEnum("status", ["pendente", "pago", "vencido", "cancelado"]).default("pendente").notNull(),
  notes: text("notes"),
  documentUrl: varchar("documentUrl", { length: 500 }), // Comprovante em S3
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountPayable = typeof accountsPayable.$inferSelect;
export type InsertAccountPayable = typeof accountsPayable.$inferInsert;

/** Contas a Receber */
export const accountsReceivable = mysqlTable("accounts_receivable", {
  id: int("id").autoincrement().primaryKey(),
  description: varchar("description", { length: 255 }).notNull(),
  clientId: int("clientId"),
  costCenterId: int("costCenterId"),
  bankAccountId: int("bankAccountId"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: datetime("dueDate").notNull(),
  receiveDate: datetime("receiveDate"),
  status: mysqlEnum("status", ["pendente", "recebido", "vencido", "cancelado"]).default("pendente").notNull(),
  notes: text("notes"),
  documentUrl: varchar("documentUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountReceivable = typeof accountsReceivable.$inferSelect;
export type InsertAccountReceivable = typeof accountsReceivable.$inferInsert;

/** Lotes de Pagamento de Funcionários */
export const paymentBatches = mysqlTable("payment_batches", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // ex: "Mar/2026 - Todos os Funcionários"
  periodStart: datetime("periodStart").notNull(),
  periodEnd: datetime("periodEnd").notNull(),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).default("0"),
  employeeCount: int("employeeCount").default(0),
  status: mysqlEnum("status", ["pendente", "pago", "cancelado"]).default("pendente").notNull(),
  paidAt: datetime("paidAt"),
  bankAccountId: int("bankAccountId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentBatch = typeof paymentBatches.$inferSelect;
export type InsertPaymentBatch = typeof paymentBatches.$inferInsert;

/** Itens do Lote de Pagamento */
export const paymentBatchItems = mysqlTable("payment_batch_items", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  employeeId: int("employeeId").notNull(),
  daysWorked: int("daysWorked").default(0),
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }).default("0"),
  mealAllowance: decimal("mealAllowance", { precision: 10, scale: 2 }).default("0"), // Marmita
  bonus: decimal("bonus", { precision: 10, scale: 2 }).default("0"),
  voucher: decimal("voucher", { precision: 10, scale: 2 }).default("0"), // Vale
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).default("0"),
  pixKey: varchar("pixKey", { length: 255 }), // Snapshot da chave PIX no momento do pagamento
  status: mysqlEnum("status", ["pendente", "pago", "erro"]).default("pendente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentBatchItem = typeof paymentBatchItems.$inferSelect;
export type InsertPaymentBatchItem = typeof paymentBatchItems.$inferInsert;

// ============================================================
// DOCUMENTOS E AUDITORIA
// ============================================================

/** Documentos Fiscais */
export const fiscalDocuments = mysqlTable("fiscal_documents", {
  id: int("id").autoincrement().primaryKey(),
  documentType: mysqlEnum("documentType", ["invoice", "receipt", "bill", "proof", "order_of_service"]).notNull(),
  documentNumber: varchar("documentNumber", { length: 100 }),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // accounts_payable, accounts_receivable
  relatedEntityId: int("relatedEntityId"),
  issuerName: varchar("issuerName", { length: 255 }),
  issuerCNPJ: varchar("issuerCNPJ", { length: 20 }),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  issueDate: datetime("issueDate"),
  description: text("description"),
  s3Key: varchar("s3Key", { length: 500 }),
  s3Url: varchar("s3Url", { length: 500 }),
  mimeType: varchar("mimeType", { length: 50 }),
  fileSize: int("fileSize"),
  extractedData: longtext("extractedData"),
  status: mysqlEnum("status", ["pending", "processed", "verified", "archived"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FiscalDocument = typeof fiscalDocuments.$inferSelect;
export type InsertFiscalDocument = typeof fiscalDocuments.$inferInsert;

/** Logs de Auditoria */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  oldValues: longtext("oldValues"),
  newValues: longtext("newValues"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  status: mysqlEnum("status", ["success", "failure"]).default("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/** Notificações */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["payment_due", "payment_overdue", "low_balance", "system", "alert"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/** Permissões granulares por módulo por usuário */
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  module: varchar("module", { length: 50 }).notNull(), // dashboard, employees, clients, suppliers, shifts, functions, cost_centers, bank_accounts, accounts_payable, accounts_receivable, payment_batches, documents, analytics, users
  canView: boolean("canView").default(false).notNull(),
  canCreate: boolean("canCreate").default(false).notNull(),
  canEdit: boolean("canEdit").default(false).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

/** Documentos */
export const documents = mysqlTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  documentType: varchar("documentType", { length: 50 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).notNull(),
  retentionPolicy: varchar("retentionPolicy", { length: 30 }).notNull(),
  visibility: mysqlEnum("visibility", ["private", "internal", "public"])
    .default("internal")
    .notNull(),
  status: mysqlEnum("status", ["ativo", "arquivado"])
    .default("ativo")
    .notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  currentVersionId: varchar("currentVersionId", { length: 36 }),
  latestVersionNumber: int("latestVersionNumber").default(1).notNull(),
  storageBackend: mysqlEnum("storageBackend", ["local", "s3"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/** Versões dos documentos */
export const documentVersions = mysqlTable(
  "document_versions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    documentId: varchar("documentId", { length: 36 }).notNull(),
    versionNumber: int("versionNumber").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    fileSize: int("fileSize").notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    fileHash: varchar("fileHash", { length: 64 }).notNull(),
    uploadedByUserId: int("uploadedByUserId").notNull(),
    changeNotes: text("changeNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    uniqDocumentVersion: uniqueIndex("uniq_document_version").on(
      table.documentId,
      table.versionNumber
    ),
    uniqDocumentStorageKey: uniqueIndex("uniq_document_storage_key").on(
      table.storageKey
    ),
  })
);

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

/** Auditoria específica de documentos */
export const documentAuditLogs = mysqlTable("document_audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  documentId: varchar("documentId", { length: 36 }).notNull(),
  targetVersionId: varchar("targetVersionId", { length: 36 }),
  action: varchar("action", { length: 80 }).notNull(),
  userId: int("userId").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  userAgent: text("userAgent"),
  correlationId: varchar("correlationId", { length: 36 }).notNull(),
  metadata: longtext("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentAuditLog = typeof documentAuditLogs.$inferSelect;
export type InsertDocumentAuditLog = typeof documentAuditLogs.$inferInsert;

/** Tags de documentos */
export const documentTags = mysqlTable("document_tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
});

export type DocumentTag = typeof documentTags.$inferSelect;
export type InsertDocumentTag = typeof documentTags.$inferInsert;

/** Ligações entre documentos e tags */
export const documentTagLinks = mysqlTable(
  "document_tag_links",
  {
    documentId: varchar("documentId", { length: 36 }).notNull(),
    tagId: varchar("tagId", { length: 36 }).notNull(),
  },
  table => ({
    uniqDocumentTag: uniqueIndex("uniq_document_tag").on(
      table.documentId,
      table.tagId
    ),
  })
);

export type DocumentTagLink = typeof documentTagLinks.$inferSelect;
export type InsertDocumentTagLink = typeof documentTagLinks.$inferInsert;

/** Vinculos entre documentos e entidades do sistema */
export const documentLinks = mysqlTable(
  "document_links",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    documentId: varchar("documentId", { length: 36 }).notNull(),
    entityType: varchar("entityType", { length: 50 }).notNull(),
    entityId: varchar("entityId", { length: 50 }).notNull(),
    label: varchar("label", { length: 255 }),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    uniqDocumentLink: uniqueIndex("uniq_document_link").on(
      table.documentId,
      table.entityType,
      table.entityId
    ),
  })
);

export type DocumentLink = typeof documentLinks.$inferSelect;
export type InsertDocumentLink = typeof documentLinks.$inferInsert;

/** Jobs de limpeza de storage */
export const storageCleanupJobs = mysqlTable("storage_cleanup_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  backend: mysqlEnum("backend", ["local", "s3"]).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"])
    .default("pending")
    .notNull(),
  reason: varchar("reason", { length: 120 }).notNull(),
  attempts: int("attempts").default(0).notNull(),
  lastError: text("lastError"),
  notBefore: timestamp("notBefore").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StorageCleanupJob = typeof storageCleanupJobs.$inferSelect;
export type InsertStorageCleanupJob = typeof storageCleanupJobs.$inferInsert;

/** Módulos disponíveis no sistema */
// ============================================================
// PLANEJAMENTOS - Escalas de Trabalho
// ============================================================

/** Planejamentos (escalas de trabalho diárias) */
export const workSchedules = mysqlTable("work_schedules", {
  id: int("id").autoincrement().primaryKey(),
  date: datetime("date").notNull(),
  shiftId: int("shiftId"),
  clientId: int("clientId").notNull(),
  clientUnitId: int("clientUnitId"),
  status: mysqlEnum("status", ["pendente", "validado", "cancelado"]).default("pendente").notNull(),
  totalPayValue: decimal("totalPayValue", { precision: 15, scale: 2 }).default("0"),
  totalReceiveValue: decimal("totalReceiveValue", { precision: 15, scale: 2 }).default("0"),
  totalPeople: int("totalPeople").default(0),
  leaderId: int("leaderId"), // Funcionário responsável (líder) da operação
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkSchedule = typeof workSchedules.$inferSelect;
export type InsertWorkSchedule = typeof workSchedules.$inferInsert;

/** Funções alocadas dentro de um planejamento */
export const scheduleFunctions = mysqlTable("schedule_functions", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").notNull(),
  jobFunctionId: int("jobFunctionId").notNull(),
  payValue: decimal("payValue", { precision: 10, scale: 2 }).default("0"), // Valor padrão paga
  receiveValue: decimal("receiveValue", { precision: 10, scale: 2 }).default("0"), // Valor padrão recebe
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleFunction = typeof scheduleFunctions.$inferSelect;
export type InsertScheduleFunction = typeof scheduleFunctions.$inferInsert;

/** Funcionários alocados dentro de uma função de um planejamento */
export const scheduleAllocations = mysqlTable("schedule_allocations", {
  id: int("id").autoincrement().primaryKey(),
  scheduleFunctionId: int("scheduleFunctionId").notNull(),
  scheduleId: int("scheduleId").notNull(),
  employeeId: int("employeeId").notNull(),
  payValue: decimal("payValue", { precision: 10, scale: 2 }).default("0"),
  receiveValue: decimal("receiveValue", { precision: 10, scale: 2 }).default("0"),
  mealAllowance: decimal("mealAllowance", { precision: 10, scale: 2 }).default("0"), // Marmita
  voucher: decimal("voucher", { precision: 10, scale: 2 }).default("0"), // Vale
  bonus: decimal("bonus", { precision: 10, scale: 2 }).default("0"),
  paymentBatchId: int("paymentBatchId"), // Referência ao lote de pagamento (null = não pago)
  attendanceStatus: mysqlEnum("attendance_status", ["presente", "faltou", "parcial"]).default("presente"),
  allocNotes: text("alloc_notes"), // Observação individual (motivo falta, etc.)
  checkInTime: datetime("checkInTime"), // Horário de chegada registrado pelo líder
  checkOutTime: datetime("checkOutTime"), // Horário de saída registrado pelo líder
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleAllocation = typeof scheduleAllocations.$inferSelect;
export type InsertScheduleAllocation = typeof scheduleAllocations.$inferInsert;

/** Ocorrencias registradas durante a operacao */
export const scheduleOccurrences = mysqlTable("schedule_occurrences", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id")
    .notNull()
    .references(() => workSchedules.id, { onDelete: "cascade" }),
  employeeId: int("employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  type: mysqlEnum("type", [
    "late",
    "early_exit",
    "absence",
    "client_issue",
    "other",
    "critical",
  ])
    .notNull(),
  description: text("description"),
  autoGenerated: boolean("auto_generated").default(false).notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: int("created_by"),
});

export type ScheduleOccurrence = typeof scheduleOccurrences.$inferSelect;
export type InsertScheduleOccurrence = typeof scheduleOccurrences.$inferInsert;

export const SYSTEM_MODULES = [
  "dashboard",
  "employees",
  "clients",
  "suppliers",
  "shifts",
  "functions",
  "cost_centers",
  "bank_accounts",
  "accounts_payable",
  "accounts_receivable",
  "payment_batches",
  "schedules",
  "documents",
  "analytics",
  "users",
] as const;

export type SystemModule = typeof SYSTEM_MODULES[number];

// ============================================================
// SOLICITAÇÕES DE ALTERAÇÃO DE PIX
// ============================================================

/** Solicitações de alteração de chave PIX (líder solicita, admin aprova) */
export const pixChangeRequests = mysqlTable("pix_change_requests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  oldPixKey: text("oldPixKey"),
  newPixKey: text("newPixKey").notNull(),
  status: mysqlEnum("status", ["pendente", "aprovado", "rejeitado"]).default("pendente").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PixChangeRequest = typeof pixChangeRequests.$inferSelect;
export type InsertPixChangeRequest = typeof pixChangeRequests.$inferInsert;

// ============================================================
// TEMPLATES DE RELATORIOS
// ============================================================
/** Templates de relatórios salvos pelos usuários */
export const reportTemplates = mysqlTable("report_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  filters: longtext("filters").notNull(), // JSON com filtros
  sections: longtext("sections").notNull(), // JSON com seções selecionadas
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;

// ============================================================
// NOTAS FISCAIS RECEBIDAS (Focus NFe)
// ============================================================
/** Notas fiscais eletrônicas recebidas via Focus NFe */
export const nfesReceived = mysqlTable("nfes_received", {
  id: int("id").autoincrement().primaryKey(),
  nfeNumber: varchar("nfeNumber", { length: 44 }).unique().notNull(), // Chave de acesso NFe
  emitterCNPJ: varchar("emitterCNPJ", { length: 14 }).notNull(),
  emitterName: varchar("emitterName", { length: 255 }).notNull(),
  receiverCNPJ: varchar("receiverCNPJ", { length: 14 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  issueDate: datetime("issueDate").notNull(),
  dueDate: datetime("dueDate"),
  description: text("description"),
  status: mysqlEnum("status", ["received", "processed", "reconciled", "rejected"]).default("received").notNull(),
  nfeType: mysqlEnum("nfeType", ["nfe", "nfce", "cte", "mde"]).default("nfe").notNull(),
  xmlUrl: text("xmlUrl"), // URL do XML armazenado
  focusNfeId: varchar("focusNfeId", { length: 255 }).unique(), // ID retornado pela Focus NFe
  linkedAccountId: int("linkedAccountId"), // ID da conta a receber vinculada
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NfeReceived = typeof nfesReceived.$inferSelect;
export type InsertNfeReceived = typeof nfesReceived.$inferInsert;
