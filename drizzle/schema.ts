import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, decimal, boolean, json, index, uniqueIndex } from "drizzle-orm/mysql-core";

// ============================================================
// USERS (Auth - tabela do template)
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }).default("jwt"),
  role: mysqlEnum("role", ["admin", "gestor", "colaborador", "user"]).default("colaborador").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),

  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// AUDIT_LOGS (Log de Auditoria)
// ============================================================
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // CREATE, READ, UPDATE, DELETE
  resource: varchar("resource", { length: 100 }).notNull(), // employees, vacations, etc
  resourceId: int("resourceId"),
  status: int("status").default(200), // HTTP status code
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  changesBefore: json("changesBefore"),
  changesAfter: json("changesAfter"),
  description: text("description"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================
// PERMISSIONS (Permissões por Role)
// ============================================================
export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["admin", "gestor", "colaborador"]).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(), // employees, vacations, etc
  action: varchar("action", { length: 50 }).notNull(), // create, read, update, delete
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

// ============================================================
// LOGIN_LOGS (Log de Acesso)
// ============================================================
export const loginLogs = mysqlTable("login_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  email: varchar("email", { length: 320 }),
  success: boolean("success").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  reason: varchar("reason", { length: 255 }), // Motivo da falha
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = typeof loginLogs.$inferInsert;

// ============================================================
// EMPLOYEES (Funcionários)
// ============================================================
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  socialName: varchar("socialName", { length: 255 }),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  rg: varchar("rg", { length: 20 }),
  birthDate: date("birthDate"),
  gender: mysqlEnum("gender", ["M", "F", "Outro"]),
  maritalStatus: mysqlEnum("maritalStatus", ["Solteiro", "Casado", "Divorciado", "Viúvo", "União Estável"]),
  nationality: varchar("nationality", { length: 100 }),
  educationLevel: varchar("educationLevel", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  addressStreet: varchar("addressStreet", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  addressComplement: varchar("addressComplement", { length: 100 }),
  addressNeighborhood: varchar("addressNeighborhood", { length: 100 }),
  addressCity: varchar("addressCity", { length: 100 }),
  addressState: varchar("addressState", { length: 2 }),
  addressZip: varchar("addressZip", { length: 10 }),
  ctpsNumber: varchar("ctpsNumber", { length: 20 }),
  ctpsSeries: varchar("ctpsSeries", { length: 10 }),
  pisPasep: varchar("pisPasep", { length: 20 }),
  voterTitle: varchar("voterTitle", { length: 20 }),
  militaryCert: varchar("militaryCert", { length: 20 }),
  cnhNumber: varchar("cnhNumber", { length: 20 }),
  cnhCategory: varchar("cnhCategory", { length: 5 }),
  cnhExpiry: date("cnhExpiry"),
  bankName: varchar("bankName", { length: 100 }),
  bankAgency: varchar("bankAgency", { length: 20 }),
  bankAccount: varchar("bankAccount", { length: 30 }),
  pixKey: varchar("pixKey", { length: 255 }),
  photoUrl: varchar("photoUrl", { length: 500 }),
  branch: varchar("branch", { length: 100 }),
  externalCode: varchar("externalCode", { length: 50 }),
  costCenter: varchar("costCenter", { length: 100 }),
  corporateEmail: varchar("corporateEmail", { length: 255 }),
  employmentType: mysqlEnum("employmentType", ["CLT", "CLT_Comissao", "Comissionado", "Concursado", "Contrato", "Cooperado", "Efetivo", "Estagio", "Estatutario", "MenorAprendiz", "JovemAprendiz", "PrestadorServico", "Socio", "Temporario", "Outro"]).default("CLT"),
  esocialMatricula: varchar("esocialMatricula", { length: 20 }),
  insalubrityPercentage: mysqlEnum("insalubrityPercentage", ["0", "10", "20", "40"]).default("0"),
  userId: int("userId"),
  managerId: int("manager_id"),
  departmentId: int("department_id"),
  status: mysqlEnum("status", ["Ativo", "Inativo", "Afastado", "Férias"]).default("Ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ============================================================
// POSITIONS (Cargos)
// ============================================================
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  cboCode: varchar("cboCode", { length: 10 }),
  description: text("description"),
  department: varchar("department", { length: 100 }),
  baseSalary: decimal("baseSalary", { precision: 10, scale: 2 }),
  hazardLevel: mysqlEnum("hazardLevel", ["Nenhum", "Insalubridade", "Periculosidade"]).default("Nenhum"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

// ============================================================
// CONTRACTS (Contratos)
// ============================================================
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  positionId: int("positionId"),
  contractType: mysqlEnum("contractType", ["CLT", "Estágio", "Temporário", "Experiência"]).notNull(),
  hireDate: date("hireDate").notNull(),
  experienceEndDate: date("experienceEndDate"),
  experienceRenewed: boolean("experienceRenewed").default(false),
  terminationDate: date("terminationDate"),
  terminationReason: varchar("terminationReason", { length: 255 }),
  workSchedule: varchar("workSchedule", { length: 100 }),
  weeklyHours: decimal("weeklyHours", { precision: 4, scale: 2 }),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  // Jornada — definida na contratação
  scheduleType: mysqlEnum("scheduleType", [
    "5x2", "6x1", "12x36", "parcial_30h", "parcial_25h", "flexivel", "intermitente"
  ]).default("5x2").notNull(),
  workDays: json("workDays").$type<number[]>().default([1, 2, 3, 4, 5]),
  startTime: varchar("startTime", { length: 5 }).default("08:00"),
  endTime: varchar("endTime", { length: 5 }).default("17:00"),
  lunchBreakMinutes: int("lunchBreakMinutes").default(60),
  toleranceMinutes: int("toleranceMinutes").default(5),
  hourBankEnabled: boolean("hourBankEnabled").default(false),
  nightShiftEnabled: boolean("nightShiftEnabled").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// ============================================================
// EMPLOYEE_POSITIONS (Histórico de Cargos/Salários)
// ============================================================
export const employeePositions = mysqlTable("employee_positions", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  positionId: int("positionId").notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  changeReason: varchar("changeReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmployeePosition = typeof employeePositions.$inferSelect;
export type InsertEmployeePosition = typeof employeePositions.$inferInsert;

// ============================================================
// VACATIONS (Férias - Períodos Aquisitivos)
// ============================================================
export const vacations = mysqlTable("vacations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  acquisitionStart: date("acquisitionStart").notNull(),
  acquisitionEnd: date("acquisitionEnd").notNull(),
  concessionLimit: date("concessionLimit").notNull(),
  daysEntitled: int("daysEntitled").default(30).notNull(),
  daysTaken: int("daysTaken").default(0).notNull(),
  status: mysqlEnum("status", ["Pendente", "Agendada", "Em Gozo", "Concluída", "Vencida"]).default("Pendente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vacation = typeof vacations.$inferSelect;
export type InsertVacation = typeof vacations.$inferInsert;

// ============================================================
// VACATION_PERIODS (Períodos de Férias Gozados)
// ============================================================
export const vacationPeriods = mysqlTable("vacation_periods", {
  id: int("id").autoincrement().primaryKey(),
  vacationId: int("vacationId").notNull(),
  employeeId: int("employeeId").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  days: int("days").notNull(),
  isPecuniaryAllowance: boolean("isPecuniaryAllowance").default(false),
  pecuniaryDays: int("pecuniaryDays").default(0),
  noticeDate: date("noticeDate"),
  status: mysqlEnum("status", ["Agendada", "Em Gozo", "Concluída", "Cancelada"]).default("Agendada").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VacationPeriod = typeof vacationPeriods.$inferSelect;
export type InsertVacationPeriod = typeof vacationPeriods.$inferInsert;

// ============================================================
// MEDICAL_EXAMS (ASO e Exames Médicos)
// ============================================================
export const medicalExams = mysqlTable("medical_exams", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  examType: mysqlEnum("examType", ["Admissional", "Periódico", "Demissional", "Retorno", "Mudança de Função"]).notNull(),
  examDate: date("examDate").notNull(),
  expiryDate: date("expiryDate").notNull(),
  result: mysqlEnum("result", ["Apto", "Inapto", "Apto com Restrições"]),
  doctorName: varchar("doctorName", { length: 255 }),
  crm: varchar("crm", { length: 20 }),
  clinicName: varchar("clinicName", { length: 255 }),
  observations: text("observations"),
  documentUrl: varchar("documentUrl", { length: 500 }),
  status: mysqlEnum("status", ["Válido", "Vencido", "Próximo do Vencimento"]).default("Válido").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MedicalExam = typeof medicalExams.$inferSelect;
export type InsertMedicalExam = typeof medicalExams.$inferInsert;

// ============================================================
// LEAVES (Afastamentos)
// ============================================================
export const leaves = mysqlTable("leaves", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  leaveType: mysqlEnum("leaveType", ["Médico", "INSS", "Maternidade", "Paternidade", "Acidente de Trabalho", "Outros"]).notNull(),
  startDate: date("startDate").notNull(),
  expectedReturnDate: date("expectedReturnDate"),
  actualReturnDate: date("actualReturnDate"),
  inssProtocol: varchar("inssProtocol", { length: 50 }),
  observations: text("observations"),
  documentUrl: varchar("documentUrl", { length: 500 }),
  status: mysqlEnum("status", ["Ativo", "Encerrado"]).default("Ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = typeof leaves.$inferInsert;

// ============================================================
// TIME_BANK (Banco de Horas)
// ============================================================
export const timeBank = mysqlTable("time_bank", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  referenceMonth: date("referenceMonth").notNull(),
  hoursBalance: decimal("hoursBalance", { precision: 6, scale: 2 }).notNull(),
  expiryDate: date("expiryDate").notNull(),
  observations: text("observations"),
  status: mysqlEnum("status", ["Ativo", "Compensado", "Vencido", "Pago"]).default("Ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TimeBank = typeof timeBank.$inferSelect;
export type InsertTimeBank = typeof timeBank.$inferInsert;

// ============================================================
// BENEFITS (Benefícios)
// ============================================================
export const benefits = mysqlTable("benefits", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  benefitType: mysqlEnum("benefitType", ["Vale Transporte", "Vale Alimentação", "Vale Refeição", "Plano de Saúde", "Plano Odontológico", "Seguro de Vida", "Outros"]).notNull(),
  provider: varchar("provider", { length: 255 }),
  planName: varchar("planName", { length: 255 }),
  value: decimal("value", { precision: 10, scale: 2 }),
  employeeContribution: decimal("employeeContribution", { precision: 10, scale: 2 }),
  optedOut: boolean("optedOut").default(false),
  optOutDate: date("optOutDate"),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  status: mysqlEnum("status", ["Ativo", "Inativo", "Suspenso"]).default("Ativo").notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Benefit = typeof benefits.$inferSelect;
export type InsertBenefit = typeof benefits.$inferInsert;

// ============================================================
// DOCUMENTS (Dossiê Digital / GED)
// ============================================================
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  category: mysqlEnum("category", ["Pessoal", "Contratual", "Saúde e Segurança", "Benefícios", "Termos", "Treinamentos", "Outros"]).notNull(),
  documentName: varchar("documentName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  fileType: varchar("fileType", { length: 10 }),
  fileSize: int("fileSize"),
  expiryDate: date("expiryDate"),
  origin: varchar("origin", { length: 30 }),
  admissionWorkflowId: int("admission_workflow_id"),
  admissionChecklistItemId: int("admission_checklist_item_id"),
  isPrimaryEvidence: boolean("is_primary_evidence").default(false).notNull(),
  lifecycleStatus: varchar("lifecycle_status", { length: 20 }).default("stored").notNull(),
  observations: text("observations"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ============================================================
// CHECKLIST_ITEMS (Checklist Admissão/Rescisão)
// ============================================================
export const checklistItems = mysqlTable("checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  checklistType: mysqlEnum("checklistType", ["Admissão", "Rescisão"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  itemDescription: varchar("itemDescription", { length: 255 }).notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedDate: date("completedDate"),
  completedBy: varchar("completedBy", { length: 255 }),
  documentId: int("documentId"),
  sourceWorkflowId: int("sourceWorkflowId"),
  sourceItemId: int("sourceItemId"),
  mirrorOrigin: varchar("mirrorOrigin", { length: 50 }),
  isEditable: boolean("isEditable").default(true).notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  employeeMirrorIdx: uniqueIndex("idx_employee_mirror").on(
    table.employeeId,
    table.sourceItemId,
    table.mirrorOrigin
  ),
}));

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

// ============================================================
// EQUIPMENT (Equipamentos)
// ============================================================
export const equipment = mysqlTable("equipment", {
  id: int("id").autoincrement().primaryKey(),
  equipmentType: varchar("equipmentType", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 255 }),
  serialNumber: varchar("serialNumber", { length: 100 }),
  imei: varchar("imei", { length: 50 }),
  patrimonyCode: varchar("patrimonyCode", { length: 50 }),
  status: mysqlEnum("status", ["Disponível", "Emprestado", "Em Manutenção", "Baixado"]).default("Disponível").notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

// ============================================================
// EQUIPMENT_LOANS (Empréstimo de Equipamentos)
// ============================================================
export const equipmentLoans = mysqlTable("equipment_loans", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipmentId").notNull(),
  employeeId: int("employeeId").notNull(),
  loanDate: date("loanDate").notNull(),
  returnDate: date("returnDate"),
  conditionAtLoan: varchar("conditionAtLoan", { length: 255 }),
  conditionAtReturn: varchar("conditionAtReturn", { length: 255 }),
  termDocumentId: int("termDocumentId"),
  status: mysqlEnum("status", ["Ativo", "Devolvido"]).default("Ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EquipmentLoan = typeof equipmentLoans.$inferSelect;
export type InsertEquipmentLoan = typeof equipmentLoans.$inferInsert;

// ============================================================
// PPE_DELIVERIES (Entrega de EPIs)
// ============================================================
export const ppeDeliveries = mysqlTable("ppe_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  ppeDescription: varchar("ppeDescription", { length: 255 }).notNull(),
  caNumber: varchar("caNumber", { length: 20 }),
  quantity: int("quantity").notNull(),
  deliveryDate: date("deliveryDate").notNull(),
  returnDate: date("returnDate"),
  reason: varchar("reason", { length: 255 }),
  employeeSignature: boolean("employeeSignature").default(false),
  documentId: int("documentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PpeDelivery = typeof ppeDeliveries.$inferSelect;
export type InsertPpeDelivery = typeof ppeDeliveries.$inferInsert;

// ============================================================
// TRAININGS (Treinamentos)
// ============================================================
export const trainings = mysqlTable("trainings", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  trainingName: varchar("trainingName", { length: 255 }).notNull(),
  nrReference: varchar("nrReference", { length: 20 }),
  trainingDate: date("trainingDate").notNull(),
  expiryDate: date("expiryDate"),
  hours: decimal("hours", { precision: 4, scale: 2 }),
  provider: varchar("provider", { length: 255 }),
  certificateUrl: varchar("certificateUrl", { length: 500 }),
  status: mysqlEnum("status", ["Válido", "Vencido", "Próximo do Vencimento"]).default("Válido").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Training = typeof trainings.$inferSelect;
export type InsertTraining = typeof trainings.$inferInsert;

// ============================================================
// SERVICE_ORDERS (Ordens de Serviço)
// ============================================================
export const serviceOrders = mysqlTable("service_orders", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  positionId: int("positionId"),
  nrReference: varchar("nrReference", { length: 20 }),
  activities: text("activities"),
  risks: text("risks"),
  recommendedPpe: text("recommendedPpe"),
  preventiveMeasures: text("preventiveMeasures"),
  requiredTrainings: text("requiredTrainings"),
  issueDate: date("issueDate").notNull(),
  employeeSignature: boolean("employeeSignature").default(false),
  documentId: int("documentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = typeof serviceOrders.$inferInsert;

// ============================================================
// DOCUMENT_TEMPLATES (Modelos de Documentos)
// ============================================================
export const documentTemplates = mysqlTable("document_templates", {
  id: int("id").autoincrement().primaryKey(),
  templateName: varchar("templateName", { length: 255 }).notNull(),
  machineKey: varchar("machine_key", { length: 100 }).unique(),
  templateType: mysqlEnum("templateType", [
    "Termo de Responsabilidade",
    "Declaração de Pendência",
    "Ficha de EPI",
    "Ordem de Serviço",
    "Aviso de Férias",
    "Outros"
  ]).notNull(),
  content: text("content").notNull(),
  placeholders: text("placeholders"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = typeof documentTemplates.$inferInsert;

// ============================================================
// NOTIFICATIONS (Notificações)
// ============================================================
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["Férias", "ASO", "Banco de Horas", "Contrato Experiência", "Treinamento", "Documento", "EPI", "Geral"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  severity: mysqlEnum("severity", ["Info", "Aviso", "Crítico"]).default("Info").notNull(),
  relatedEmployeeId: int("relatedEmployeeId"),
  userId: int("userId"),
  isRead: boolean("isRead").default(false).notNull(),
  dueDate: date("dueDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userUnreadIdx: index("idx_notifications_user_unread").on(table.userId, table.isRead),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================
// HOLIDAYS (Feriados)
// ============================================================
export const holidays = mysqlTable("holidays", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  date: date("date").notNull(),
  type: mysqlEnum("type", ["Nacional", "Estadual", "Municipal"]).default("Nacional").notNull(),
  recurring: boolean("recurring").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = typeof holidays.$inferInsert;

// ============================================================
// SETTINGS (Configurações do Sistema)
// ============================================================
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: varchar("description", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// Tabela auditLog removida - usar auditLogs ao invés

// ============================================================
// ABSENCES (Faltas - para cálculo de férias CLT)
// ============================================================
export const absences = mysqlTable("absences", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  absenceDate: date("absenceDate").notNull(),
  justified: boolean("justified").default(false).notNull(),
  reason: varchar("reason", { length: 255 }),
  documentUrl: varchar("documentUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Absence = typeof absences.$inferSelect;
export type InsertAbsence = typeof absences.$inferInsert;

// ============================================================
// DEPENDENTS (Dependentes do Funcionário)
// ============================================================
export const dependents = mysqlTable("dependents", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  relationship: mysqlEnum("relationship", ["Cônjuge", "Filho(a)", "Enteado(a)", "Pai/Mãe", "Outros"]).notNull(),
  birthDate: date("birthDate"),
  cpf: varchar("cpf", { length: 14 }),
  irDeduction: boolean("irDeduction").default(false),
  familySalary: boolean("familySalary").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Dependent = typeof dependents.$inferSelect;
export type InsertDependent = typeof dependents.$inferInsert;

// ============================================================
// PGR (Programa de Gestão de Riscos)
// ============================================================
export const pgr = mysqlTable("pgr", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).notNull(),
  issueDate: date("issueDate").notNull(),
  expiryDate: date("expiryDate").notNull(),
  documentUrl: varchar("documentUrl", { length: 500 }),
  fileKey: varchar("fileKey", { length: 500 }),
  status: mysqlEnum("status", ["Válido", "Vencido", "Próximo do Vencimento"]).default("Válido").notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PGR = typeof pgr.$inferSelect;
export type InsertPGR = typeof pgr.$inferInsert;

// ============================================================
// PCMSO (Programa de Controle Médico de Saúde Ocupacional)
// ============================================================
export const pcmso = mysqlTable("pcmso", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).notNull(),
  issueDate: date("issueDate").notNull(),
  expiryDate: date("expiryDate").notNull(),
  documentUrl: varchar("documentUrl", { length: 500 }),
  fileKey: varchar("fileKey", { length: 500 }),
  status: mysqlEnum("status", ["Válido", "Vencido", "Próximo do Vencimento"]).default("Válido").notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PCMSO = typeof pcmso.$inferSelect;
export type InsertPCMSO = typeof pcmso.$inferInsert;

// ============================================================
// DASHBOARD_SETTINGS (Configurações do Dashboard)
// ============================================================
export const dashboardSettings = mysqlTable("dashboard_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  visibleMetrics: text("visibleMetrics").notNull(), // JSON array de métricas visíveis
  metricsOrder: text("metricsOrder"), // JSON array com ordem das métricas
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardSetting = typeof dashboardSettings.$inferSelect;
export type InsertDashboardSetting = typeof dashboardSettings.$inferInsert;

// ============================================================
// DIGITAL SIGNATURES (Assinatura Digital)
// ============================================================
export const digitalSignatures = mysqlTable("digital_signatures", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  signerName: varchar("signerName", { length: 255 }).notNull(),
  signerEmail: varchar("signerEmail", { length: 255 }).notNull(),
  documentHash: varchar("documentHash", { length: 512 }).notNull(),
  signatureHash: varchar("signatureHash", { length: 512 }).notNull(),
  signatureTimestamp: timestamp("signatureTimestamp").notNull(),
  signatureMethod: mysqlEnum("signatureMethod", ["PIN", "BIOMETRIC", "CERTIFICATE"]).default("PIN").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  isValid: boolean("isValid").default(true).notNull(),
  validationTimestamp: timestamp("validationTimestamp"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type InsertDigitalSignature = typeof digitalSignatures.$inferInsert;


// ============================================================
// TIME RECORDS (Registros de Ponto)
// ============================================================
export const timeRecords = mysqlTable("time_records", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade", onUpdate: "cascade" }),
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  hoursWorked: decimal("hours_worked", { precision: 6, scale: 2 }),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  approvedById: int("approved_by_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  approvedAt: timestamp("approved_at"),
  updatedById: int("updated_by_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  // Portaria MTP 671/2021 (REP-P)
  nsr: int("nsr"),
  previousHash: varchar("previous_hash", { length: 64 }),
  recordHash: varchar("record_hash", { length: 64 }),
  // Anti-fraude (Fase 7)
  selfieUrl: varchar("selfie_url", { length: 500 }),
  geofenceStatus: mysqlEnum("geofence_status", ["within", "outside", "no_geo"]).default("no_geo"),
  deviceFingerprint: varchar("device_fingerprint", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  employeeClockInIdx: index("idx_time_employee_clockin").on(table.employeeId, table.clockIn),
  employeeStatusIdx: index("idx_time_employee_status").on(table.employeeId, table.status),
  clockInIdx: index("idx_time_clockin").on(table.clockIn),
  nsrIdx: index("idx_time_nsr").on(table.nsr),
}));

// ============================================================
// COMPLIANCE EXPORTS (AFD/AFDT/ACJEF — Portaria 671/2021)
// ============================================================
export const complianceExports = mysqlTable("compliance_exports", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["AFD", "AFDT", "ACJEF"]).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  generatedById: int("generated_by_id").references(() => users.id, { onDelete: "set null" }),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  recordCount: int("record_count").default(0).notNull(),
  fileSha256: varchar("file_sha256", { length: 64 }),
  fileBytes: int("file_bytes"),
  notes: text("notes"),
}, (table) => ({
  typePeriodIdx: index("idx_compliance_type_period").on(table.type, table.periodStart),
}));

export type ComplianceExport = typeof complianceExports.$inferSelect;
export type InsertComplianceExport = typeof complianceExports.$inferInsert;

export type TimeRecord = typeof timeRecords.$inferSelect;
export type InsertTimeRecord = typeof timeRecords.$inferInsert;

// ============================================================
// OVERTIME RECORDS (Registros de Horas Extras)
// ============================================================
export const overtimeRecords = mysqlTable("overtime_records", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade", onUpdate: "cascade" }),
  timeRecordId: int("time_record_id")
    .notNull()
    .references(() => timeRecords.id, { onDelete: "cascade", onUpdate: "cascade" }),
  hoursWorked: decimal("hours_worked", { precision: 6, scale: 2 }).notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).notNull(),
  multiplier: decimal("multiplier", { precision: 3, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["50%", "100%", "NOTURNO"]).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  approvedById: int("approved_by_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  employeeStatusIdx: index("idx_ot_employee_status").on(table.employeeId, table.status),
  timeRecordIdx: index("idx_ot_timerecord").on(table.timeRecordId),
  typeIdx: index("idx_ot_type").on(table.type),
  employeeCreatedIdx: index("idx_ot_employee_created").on(table.employeeId, table.createdAt),
}));

export type OvertimeRecord = typeof overtimeRecords.$inferSelect;
export type InsertOvertimeRecord = typeof overtimeRecords.$inferInsert;

// ============================================================
// OVERTIME AUTHORIZATIONS (Pré-autorização de horas extras)
// ============================================================
export const overtimeAuthorizations = mysqlTable("overtime_authorizations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade", onUpdate: "cascade" }),
  authorizedDate: date("authorized_date").notNull(),
  maxHours: decimal("max_hours", { precision: 5, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["50%", "100%", "NOTURNO"]).notNull(),
  authorizedById: int("authorized_by_id").references(() => users.id, { onDelete: "set null" }),
  authorizedAt: timestamp("authorized_at").defaultNow().notNull(),
  reason: text("reason"),
  consumed: boolean("consumed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  employeeDateIdx: index("idx_otauth_employee_date").on(table.employeeId, table.authorizedDate),
}));

export type OvertimeAuthorization = typeof overtimeAuthorizations.$inferSelect;
export type InsertOvertimeAuthorization = typeof overtimeAuthorizations.$inferInsert;

// ============================================================
// JOB OPENINGS (Vagas de Emprego)
// ============================================================
export const jobOpenings = mysqlTable("job_openings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }),
  positionId: int("positionId"),
  description: text("description"),
  requirements: text("requirements"),
  salaryMin: decimal("salaryMin", { precision: 10, scale: 2 }),
  salaryMax: decimal("salaryMax", { precision: 10, scale: 2 }),
  vacancies: int("vacancies").default(1).notNull(),
  status: mysqlEnum("status", ["Aberta", "Em Andamento", "Fechada", "Cancelada"]).default("Aberta").notNull(),
  priority: mysqlEnum("priority", ["Baixa", "Normal", "Alta", "Urgente"]).default("Normal").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  createdBy: varchar("createdBy", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type JobOpening = typeof jobOpenings.$inferSelect;
export type InsertJobOpening = typeof jobOpenings.$inferInsert;

// ============================================================
// CANDIDATES (Candidatos)
// ============================================================
export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  jobOpeningId: int("jobOpeningId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  resumeUrl: varchar("resumeUrl", { length: 500 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  stage: mysqlEnum("stage", ["Triagem", "Entrevista RH", "Entrevista Tecnica", "Entrevista Final", "Aprovado", "Reprovado", "Desistiu"]).default("Triagem").notNull(),
  notes: text("notes"),
  rating: int("rating"),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = typeof candidates.$inferInsert;

// ============================================================
// DEPARTMENTS (Departamentos / hierarquia organizacional)
// ============================================================
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  parentId: int("parent_id"),
  headEmployeeId: int("head_employee_id"),
  costCenter: varchar("cost_center", { length: 50 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  parentIdx: index("idx_dept_parent").on(table.parentId),
}));

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

// ============================================================
// EMPLOYEE MANAGER HISTORY (auditoria de troca de gestor)
// ============================================================
export const employeeManagerHistory = mysqlTable("employee_manager_history", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").notNull(),
  managerId: int("manager_id"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  changedById: int("changed_by_id"),
  reason: varchar("reason", { length: 255 }),
}, (table) => ({
  employeeIdx: index("idx_emhist_employee").on(table.employeeId),
}));

export type EmployeeManagerHistory = typeof employeeManagerHistory.$inferSelect;
export type InsertEmployeeManagerHistory = typeof employeeManagerHistory.$inferInsert;

// ============================================================
// ADMISSION WORKFLOWS (Workflow de admissão de novos funcionários)
// ============================================================
export const admissionWorkflows = mysqlTable("admission_workflows", {
  id: int("id").autoincrement().primaryKey(),
  candidateName: varchar("candidate_name", { length: 255 }).notNull(),
  candidateEmail: varchar("candidate_email", { length: 255 }),
  candidateCpf: varchar("candidate_cpf", { length: 14 }),
  candidatePhone: varchar("candidate_phone", { length: 20 }),
  positionId: int("position_id"),
  departmentId: int("department_id"),
  managerId: int("manager_id"),
  proposedSalary: decimal("proposed_salary", { precision: 10, scale: 2 }),
  proposedHireDate: date("proposed_hire_date"),
  contractType: mysqlEnum("contract_type", ["CLT", "Estágio", "Temporário", "Experiência"]).default("CLT").notNull(),
  status: mysqlEnum("status", [
    "DRAFT",
    "DOCS_PENDING",
    "VALIDATING",
    "APPROVED",
    "ACTIVE",
    "REJECTED",
    "CANCELLED",
  ]).default("DRAFT").notNull(),
  currentStep: varchar("current_step", { length: 60 }).default("dados_basicos"),
  notes: text("notes"),
  createdById: int("created_by_id"),
  approvedById: int("approved_by_id"),
  resultEmployeeId: int("result_employee_id"),
  syncStatus: varchar("sync_status", { length: 20 }).default("NOT_SYNCED").notNull(),
  catalogVersion: varchar("catalog_version", { length: 20 }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("idx_adm_status").on(table.status),
  cpfIdx: index("idx_adm_cpf").on(table.candidateCpf),
}));

export type AdmissionWorkflow = typeof admissionWorkflows.$inferSelect;
export type InsertAdmissionWorkflow = typeof admissionWorkflows.$inferInsert;

// ============================================================
// ADMISSION CHECKLIST ITEMS
// ============================================================
export const admissionChecklistItems = mysqlTable("admission_checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflow_id").notNull(),
  code: varchar("code", { length: 100 }),
  category: varchar("category", { length: 80 }).notNull(),
  itemDescription: varchar("item_description", { length: 255 }).notNull(),
  kind: varchar("kind", { length: 30 }).default("manual_validation").notNull(),
  status: varchar("status", { length: 30 }).default("PENDING").notNull(),
  documentPolicy: varchar("document_policy", { length: 30 }).default("none").notNull(),
  templatePolicy: varchar("template_policy", { length: 30 }).default("none").notNull(),
  templateKey: varchar("template_key", { length: 100 }),
  signaturePolicy: varchar("signature_policy", { length: 30 }).default("none").notNull(),
  reviewPolicy: varchar("review_policy", { length: 30 }).default("manual_review").notNull(),
  reviewStatus: varchar("review_status", { length: 20 }),
  reviewedById: int("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  required: boolean("required").default(true).notNull(),
  completed: boolean("completed").default(false).notNull(),
  documentUrl: varchar("document_url", { length: 500 }),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  completedById: int("completed_by_id"),
  waivedReason: text("waived_reason"),
  waivedById: int("waived_by_id"),
  waivedAt: timestamp("waived_at"),
}, (table) => ({
  workflowIdx: index("idx_admchk_workflow").on(table.workflowId),
  workflowCodeIdx: uniqueIndex("idx_admchk_workflow_code").on(table.workflowId, table.code),
}));

export type AdmissionChecklistItem = typeof admissionChecklistItems.$inferSelect;
export type InsertAdmissionChecklistItem = typeof admissionChecklistItems.$inferInsert;
export const documentSignatures = mysqlTable("document_signatures", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  signatoryType: varchar("signatoryType", { length: 40 }).notNull(),
  signatoryId: int("signatoryId").notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  signatureMethod: varchar("signatureMethod", { length: 30 }).default("electronic"),
}, (table) => ({
  documentIdx: index("idx_docsign_document").on(table.documentId),
}));

export type DocumentSignature = typeof documentSignatures.$inferSelect;
export type InsertDocumentSignature = typeof documentSignatures.$inferInsert;

// ============================================================
// EMPLOYEE MOVEMENTS (Movimentação interna versionada)
// ============================================================
export const employeeMovements = mysqlTable("employee_movements", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").notNull(),
  kind: mysqlEnum("kind", [
    "promocao",
    "transferencia_dept",
    "troca_gestor",
    "ajuste_salarial",
    "mudanca_jornada",
    "mudanca_centro_custo",
    "mudanca_cargo",
  ]).notNull(),
  fromValue: text("from_value"),
  toValue: text("to_value"),
  effectiveDate: date("effective_date").notNull(),
  reason: text("reason"),
  approvedById: int("approved_by_id"),
  createdById: int("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  employeeIdx: index("idx_mov_employee").on(table.employeeId),
  effectiveIdx: index("idx_mov_effective").on(table.effectiveDate),
}));

export type EmployeeMovement = typeof employeeMovements.$inferSelect;
export type InsertEmployeeMovement = typeof employeeMovements.$inferInsert;

// ============================================================
// TERMINATIONS (Desligamento com workflow)
// ============================================================
export const terminations = mysqlTable("terminations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").notNull(),
  noticeDate: date("notice_date").notNull(),
  lastWorkingDay: date("last_working_day").notNull(),
  reason: mysqlEnum("reason", [
    "sem_justa_causa",
    "pedido_demissao",
    "justa_causa",
    "fim_contrato_determinado",
    "acordo_mutuo",
    "aposentadoria",
    "obito",
  ]).notNull(),
  status: mysqlEnum("status", [
    "INICIADO",
    "DOCUMENTOS",
    "DEVOLUCAO_EQUIP",
    "CALCULO_VERBAS",
    "APROVADO",
    "FINALIZADO",
    "CANCELADO",
  ]).default("INICIADO").notNull(),
  noticeType: mysqlEnum("notice_type", ["trabalhado", "indenizado", "dispensado"]),
  totalVerbas: decimal("total_verbas", { precision: 10, scale: 2 }),
  notes: text("notes"),
  initiatedById: int("initiated_by_id"),
  approvedById: int("approved_by_id"),
  initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
  finalizedAt: timestamp("finalized_at"),
}, (table) => ({
  employeeIdx: index("idx_term_employee").on(table.employeeId),
  statusIdx: index("idx_term_status").on(table.status),
}));

export type Termination = typeof terminations.$inferSelect;
export type InsertTermination = typeof terminations.$inferInsert;

// ============================================================
// TERMINATION DEVOLUTION ITEMS (devolução de equipamento/cracha)
// ============================================================
export const terminationDevolutionItems = mysqlTable("termination_devolution_items", {
  id: int("id").autoincrement().primaryKey(),
  terminationId: int("termination_id").notNull(),
  itemDescription: varchar("item_description", { length: 255 }).notNull(),
  returned: boolean("returned").default(false).notNull(),
  returnedAt: timestamp("returned_at"),
  notes: text("notes"),
}, (table) => ({
  terminationIdx: index("idx_termdev_termination").on(table.terminationId),
}));

export type TerminationDevolutionItem = typeof terminationDevolutionItems.$inferSelect;
export type InsertTerminationDevolutionItem = typeof terminationDevolutionItems.$inferInsert;

// ============================================================
// REQUESTS (caixa de entrada unificada)
// ============================================================
export const requests = mysqlTable("requests", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", [
    "ferias",
    "atestado",
    "ajuste_ponto",
    "abono",
    "horas_extras",
    "declaracao",
    "adiantamento",
    "outro",
  ]).notNull(),
  employeeId: int("employee_id").notNull(),
  status: mysqlEnum("status", [
    "PENDING",
    "IN_REVIEW",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
  ]).default("PENDING").notNull(),
  priority: mysqlEnum("priority", ["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  payload: json("payload"),
  relatedResourceType: varchar("related_resource_type", { length: 60 }),
  relatedResourceId: int("related_resource_id"),
  slaDueAt: timestamp("sla_due_at"),
  createdById: int("created_by_id"),
  resolvedById: int("resolved_by_id"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  employeeIdx: index("idx_req_employee").on(table.employeeId),
  statusIdx: index("idx_req_status").on(table.status),
  kindIdx: index("idx_req_kind").on(table.kind),
}));

export type Request = typeof requests.$inferSelect;
export type InsertRequest = typeof requests.$inferInsert;

// ============================================================
// APPROVALS (etapas de aprovação por request)
// ============================================================
export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("request_id").notNull(),
  approverUserId: int("approver_user_id"),
  level: int("level").default(1).notNull(),
  decision: mysqlEnum("decision", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  reason: text("reason"),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  requestIdx: index("idx_appr_request").on(table.requestId),
}));

export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = typeof approvals.$inferInsert;

// ============================================================
// CONSENT RECORDS (LGPD — base legal e consentimento explícito)
// ============================================================
export const consentRecords = mysqlTable("consent_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  employeeId: int("employee_id"),
  consentType: mysqlEnum("consent_type", [
    "data_processing",
    "selfie_capture",
    "geo_capture",
    "marketing_communications",
    "internal_policies",
    "biometric",
    "third_party_share",
  ]).notNull(),
  version: varchar("version", { length: 20 }).default("v1").notNull(),
  legalBasis: mysqlEnum("legal_basis", [
    "consentimento",
    "execucao_contrato",
    "obrigacao_legal",
    "interesse_legitimo",
    "protecao_credito",
    "tutela_saude",
  ]).notNull(),
  accepted: boolean("accepted").notNull(),
  acceptedAt: timestamp("accepted_at"),
  revokedAt: timestamp("revoked_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userTypeIdx: index("idx_consent_user_type").on(table.userId, table.consentType),
}));

export type ConsentRecord = typeof consentRecords.$inferSelect;
export type InsertConsentRecord = typeof consentRecords.$inferInsert;

// ============================================================
// READ AUDIT (logs de leitura de campos sensíveis)
// ============================================================
export const readAuditLogs = mysqlTable("read_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actor_user_id"),
  resource: varchar("resource", { length: 80 }).notNull(),
  field: varchar("field", { length: 60 }).notNull(),
  targetEmployeeId: int("target_employee_id"),
  scope: mysqlEnum("scope", ["self", "team", "all"]).default("all").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  actorIdx: index("idx_readlog_actor").on(table.actorUserId),
  targetIdx: index("idx_readlog_target").on(table.targetEmployeeId),
  resourceIdx: index("idx_readlog_resource").on(table.resource),
}));

export type ReadAuditLog = typeof readAuditLogs.$inferSelect;
export type InsertReadAuditLog = typeof readAuditLogs.$inferInsert;

// ============================================================
// KANBAN (boards/lists/cards/labels/members) — fase 8
// ============================================================
export * from "./schema-kanban.js";
export * from "./schema-managerial-reports.js";
export * from "./schema-operational-routines.js";
export * from "./schema-demands.js";
