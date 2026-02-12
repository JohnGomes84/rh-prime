import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, decimal, boolean, json } from "drizzle-orm/mysql-core";

// ============================================================
// USERS (Auth - tabela do template)
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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
  category: mysqlEnum("category", ["Pessoal", "Contratual", "Saúde e Segurança", "Benefícios", "Termos", "Treinamentos", "Outros"]).notNull(),
  documentName: varchar("documentName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  fileType: varchar("fileType", { length: 10 }),
  fileSize: int("fileSize"),
  expiryDate: date("expiryDate"),
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
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
  isRead: boolean("isRead").default(false).notNull(),
  dueDate: date("dueDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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

// ============================================================
// AUDIT_LOG (Log de Auditoria - LGPD)
// ============================================================
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userAction: varchar("userAction", { length: 100 }).notNull(),
  tableName: varchar("tableName", { length: 100 }).notNull(),
  recordId: int("recordId"),
  oldValues: json("oldValues"),
  newValues: json("newValues"),
  performedBy: varchar("performedBy", { length: 255 }),
  performedAt: timestamp("performedAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

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
