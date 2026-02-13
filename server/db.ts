import { eq, desc, asc, and, gte, lte, sql, like, or, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  employees, InsertEmployee,
  positions, InsertPosition,
  contracts, InsertContract,
  employeePositions, InsertEmployeePosition,
  vacations, InsertVacation,
  vacationPeriods, InsertVacationPeriod,
  medicalExams, InsertMedicalExam,
  leaves, InsertLeave,
  timeBank, InsertTimeBank,
  benefits, InsertBenefit,
  documents, InsertDocument,
  checklistItems, InsertChecklistItem,
  equipment, InsertEquipment,
  equipmentLoans, InsertEquipmentLoan,
  ppeDeliveries, InsertPpeDelivery,
  trainings, InsertTraining,
  serviceOrders, InsertServiceOrder,
  documentTemplates, InsertDocumentTemplate,
  notifications, InsertNotification,
  holidays, InsertHoliday,
  settings, InsertSetting,
  auditLogs, InsertAuditLog,
  absences, InsertAbsence,
  dependents, InsertDependent,
  pgr, InsertPGR,
  pcmso, InsertPCMSO,
  dashboardSettings, InsertDashboardSetting,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { triggerWebhook, onEmployeeCreated } from './integrations/webhooks';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function todayStr() { return new Date().toISOString().split('T')[0]!; }
function futureDateStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

// ============================================================
// USERS
// ============================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.email) throw new Error("User email is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { email: user.email, passwordHash: null };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "openId", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// EMPLOYEES
// ============================================================
export async function listEmployees(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(employees)
      .where(or(like(employees.fullName, `%${search}%`), like(employees.cpf, `%${search}%`)))
      .orderBy(asc(employees.fullName));
  }
  return db.select().from(employees).orderBy(asc(employees.fullName));
}

export async function getEmployee(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(employees).values(data);
  const employeeId = result[0].insertId;
  // Disparar webhook de criação de funcionário
  await onEmployeeCreated({ id: employeeId, ...data });
  return { id: employeeId };
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(employees).where(eq(employees.id, id));
}

export async function countEmployees() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(employees);
  return result[0]?.count ?? 0;
}

// ============================================================
// POSITIONS
// ============================================================
export async function listPositions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(positions).orderBy(asc(positions.title));
}

export async function getPosition(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(positions).where(eq(positions.id, id)).limit(1);
  return result[0];
}

export async function createPosition(data: InsertPosition) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(positions).values(data);
  return { id: result[0].insertId };
}

export async function updatePosition(id: number, data: Partial<InsertPosition>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(positions).set(data).where(eq(positions.id, id));
}

export async function deletePosition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(positions).where(eq(positions.id, id));
}

// ============================================================
// CONTRACTS
// ============================================================
export async function listContracts(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(contracts).where(eq(contracts.employeeId, employeeId)).orderBy(desc(contracts.hireDate));
  return db.select().from(contracts).orderBy(desc(contracts.hireDate));
}

export async function getContract(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return result[0];
}

export async function createContract(data: InsertContract) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(contracts).values(data);
  return { id: result[0].insertId };
}

export async function updateContract(id: number, data: Partial<InsertContract>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contracts).set(data).where(eq(contracts.id, id));
}

// ============================================================
// EMPLOYEE POSITIONS (Histórico)
// ============================================================
export async function listEmployeePositions(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employeePositions).where(eq(employeePositions.employeeId, employeeId)).orderBy(desc(employeePositions.startDate));
}

export async function createEmployeePosition(data: InsertEmployeePosition) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(employeePositions).values(data);
  return { id: result[0].insertId };
}

// ============================================================
// VACATIONS
// ============================================================
export async function listVacations(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(vacations).where(eq(vacations.employeeId, employeeId)).orderBy(desc(vacations.acquisitionStart));
  return db.select().from(vacations).orderBy(desc(vacations.acquisitionStart));
}

export async function getVacation(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vacations).where(eq(vacations.id, id)).limit(1);
  return result[0];
}

export async function createVacation(data: InsertVacation) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(vacations).values(data);
  return { id: result[0].insertId };
}

export async function updateVacation(id: number, data: Partial<InsertVacation>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(vacations).set(data).where(eq(vacations.id, id));
}

export async function getOverdueVacations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vacations)
    .where(and(sql`${vacations.concessionLimit} <= ${todayStr()}`, eq(vacations.status, "Pendente")));
}

export async function getUpcomingVacationDeadlines(daysAhead: number = 60) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vacations)
    .where(and(
      sql`${vacations.concessionLimit} >= ${todayStr()}`,
      sql`${vacations.concessionLimit} <= ${futureDateStr(daysAhead)}`,
      eq(vacations.status, "Pendente")
    ));
}

// ============================================================
// VACATION PERIODS
// ============================================================
export async function listVacationPeriods(vacationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vacationPeriods).where(eq(vacationPeriods.vacationId, vacationId)).orderBy(asc(vacationPeriods.startDate));
}

export async function listVacationPeriodsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vacationPeriods).where(eq(vacationPeriods.employeeId, employeeId)).orderBy(desc(vacationPeriods.startDate));
}

export async function createVacationPeriod(data: InsertVacationPeriod) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(vacationPeriods).values(data);
  return { id: result[0].insertId };
}

export async function updateVacationPeriod(id: number, data: Partial<InsertVacationPeriod>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(vacationPeriods).set(data).where(eq(vacationPeriods.id, id));
}

// ============================================================
// MEDICAL EXAMS
// ============================================================
export async function listMedicalExams(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(medicalExams).where(eq(medicalExams.employeeId, employeeId)).orderBy(desc(medicalExams.examDate));
  return db.select().from(medicalExams).orderBy(desc(medicalExams.examDate));
}

export async function createMedicalExam(data: InsertMedicalExam) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(medicalExams).values(data);
  return { id: result[0].insertId };
}

export async function updateMedicalExam(id: number, data: Partial<InsertMedicalExam>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(medicalExams).set(data).where(eq(medicalExams.id, id));
}

export async function getExpiredExams() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medicalExams)
    .where(and(sql`${medicalExams.expiryDate} <= ${todayStr()}`, eq(medicalExams.status, "Válido")));
}

export async function getUpcomingExamExpirations(daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medicalExams)
    .where(and(
      sql`${medicalExams.expiryDate} >= ${todayStr()}`,
      sql`${medicalExams.expiryDate} <= ${futureDateStr(daysAhead)}`,
      eq(medicalExams.status, "Válido")
    ));
}

// ============================================================
// LEAVES
// ============================================================
export async function listLeaves(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(leaves).where(eq(leaves.employeeId, employeeId)).orderBy(desc(leaves.startDate));
  return db.select().from(leaves).orderBy(desc(leaves.startDate));
}

export async function createLeave(data: InsertLeave) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(leaves).values(data);
  return { id: result[0].insertId };
}

export async function updateLeave(id: number, data: Partial<InsertLeave>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leaves).set(data).where(eq(leaves.id, id));
}

// ============================================================
// TIME BANK
// ============================================================
export async function listTimeBank(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(timeBank).where(eq(timeBank.employeeId, employeeId)).orderBy(desc(timeBank.referenceMonth));
  return db.select().from(timeBank).orderBy(desc(timeBank.referenceMonth));
}

export async function createTimeBankEntry(data: InsertTimeBank) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(timeBank).values(data);
  return { id: result[0].insertId };
}

export async function updateTimeBankEntry(id: number, data: Partial<InsertTimeBank>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(timeBank).set(data).where(eq(timeBank.id, id));
}

export async function getExpiringTimeBank(daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeBank)
    .where(and(
      sql`${timeBank.expiryDate} >= ${todayStr()}`,
      sql`${timeBank.expiryDate} <= ${futureDateStr(daysAhead)}`,
      eq(timeBank.status, "Ativo")
    ));
}

// ============================================================
// BENEFITS
// ============================================================
export async function listBenefits(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(benefits).where(eq(benefits.employeeId, employeeId)).orderBy(desc(benefits.startDate));
  return db.select().from(benefits).orderBy(desc(benefits.startDate));
}

export async function createBenefit(data: InsertBenefit) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(benefits).values(data);
  return { id: result[0].insertId };
}

export async function updateBenefit(id: number, data: Partial<InsertBenefit>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(benefits).set(data).where(eq(benefits.id, id));
}

// ============================================================
// DOCUMENTS (GED)
// ============================================================
export async function listDocuments(employeeId?: number, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (employeeId) conditions.push(eq(documents.employeeId, employeeId));
  if (category) conditions.push(eq(documents.category, category as any));
  if (conditions.length > 0) return db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.uploadedAt));
  return db.select().from(documents).orderBy(desc(documents.uploadedAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(documents).values(data);
  return { id: result[0].insertId };
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(documents).where(eq(documents.id, id));
}

// ============================================================
// CHECKLIST ITEMS
// ============================================================
export async function listChecklistItems(employeeId: number, checklistType?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(checklistItems.employeeId, employeeId)];
  if (checklistType) conditions.push(eq(checklistItems.checklistType, checklistType as any));
  return db.select().from(checklistItems).where(and(...conditions)).orderBy(asc(checklistItems.category), asc(checklistItems.id));
}

export async function createChecklistItem(data: InsertChecklistItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(checklistItems).values(data);
  return { id: result[0].insertId };
}

export async function updateChecklistItem(id: number, data: Partial<InsertChecklistItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(checklistItems).set(data).where(eq(checklistItems.id, id));
}

export async function createDefaultAdmissionChecklist(employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const items = [
    { category: "Documentos Pessoais", itemDescription: "Cópia do RG" },
    { category: "Documentos Pessoais", itemDescription: "Cópia do CPF" },
    { category: "Documentos Pessoais", itemDescription: "Cópia do comprovante de residência" },
    { category: "Documentos Pessoais", itemDescription: "Certidão de nascimento ou casamento" },
    { category: "Documentos Pessoais", itemDescription: "CTPS (física ou comprovante CTPS Digital)" },
    { category: "Documentos Pessoais", itemDescription: "Título de eleitor" },
    { category: "Admissão e Registro CLT", itemDescription: "Ficha cadastral preenchida e assinada" },
    { category: "Admissão e Registro CLT", itemDescription: "Contrato de trabalho CLT assinado" },
    { category: "Admissão e Registro CLT", itemDescription: "Ficha de registro de empregado" },
    { category: "Admissão e Registro CLT", itemDescription: "Cadastro no eSocial" },
    { category: "Admissão e Registro CLT", itemDescription: "Número do PIS/PASEP" },
    { category: "Admissão e Registro CLT", itemDescription: "Termo de opção ou renúncia de vale-transporte" },
    { category: "Admissão e Registro CLT", itemDescription: "Dados bancários / chave PIX" },
    { category: "Saúde e Segurança", itemDescription: "ASO Admissional" },
    { category: "Saúde e Segurança", itemDescription: "Ordem de Serviço (NR-1) assinada" },
    { category: "Saúde e Segurança", itemDescription: "Ficha de entrega de EPI assinada" },
    { category: "Saúde e Segurança", itemDescription: "Treinamentos obrigatórios (NRs aplicáveis)" },
    { category: "Termos e Ciência", itemDescription: "Regulamento interno (ciência e assinatura)" },
    { category: "Termos e Ciência", itemDescription: "Código de conduta / ética" },
    { category: "Termos e Ciência", itemDescription: "Termo de confidencialidade" },
    { category: "Termos e Ciência", itemDescription: "Termo de responsabilidade por equipamentos/materiais" },
  ];
  for (const item of items) {
    await db.insert(checklistItems).values({
      employeeId,
      checklistType: "Admissão",
      category: item.category,
      itemDescription: item.itemDescription,
      isCompleted: false,
    });
  }
}

// ============================================================
// EQUIPMENT
// ============================================================
export async function listEquipment() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(equipment).orderBy(asc(equipment.equipmentType));
}

export async function createEquipmentItem(data: InsertEquipment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(equipment).values(data);
  return { id: result[0].insertId };
}

export async function updateEquipmentItem(id: number, data: Partial<InsertEquipment>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(equipment).set(data).where(eq(equipment.id, id));
}

// ============================================================
// EQUIPMENT LOANS
// ============================================================
export async function listEquipmentLoans(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(equipmentLoans).where(eq(equipmentLoans.employeeId, employeeId)).orderBy(desc(equipmentLoans.loanDate));
  return db.select().from(equipmentLoans).orderBy(desc(equipmentLoans.loanDate));
}

export async function createEquipmentLoan(data: InsertEquipmentLoan) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(equipmentLoans).values(data);
  return { id: result[0].insertId };
}

export async function updateEquipmentLoan(id: number, data: Partial<InsertEquipmentLoan>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(equipmentLoans).set(data).where(eq(equipmentLoans.id, id));
}

// ============================================================
// PPE DELIVERIES (EPIs)
// ============================================================
export async function listPpeDeliveries(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(ppeDeliveries).where(eq(ppeDeliveries.employeeId, employeeId)).orderBy(desc(ppeDeliveries.deliveryDate));
  return db.select().from(ppeDeliveries).orderBy(desc(ppeDeliveries.deliveryDate));
}

export async function createPpeDelivery(data: InsertPpeDelivery) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(ppeDeliveries).values(data);
  return { id: result[0].insertId };
}

// ============================================================
// TRAININGS
// ============================================================
export async function listTrainings(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(trainings).where(eq(trainings.employeeId, employeeId)).orderBy(desc(trainings.trainingDate));
  return db.select().from(trainings).orderBy(desc(trainings.trainingDate));
}

export async function createTraining(data: InsertTraining) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(trainings).values(data);
  return { id: result[0].insertId };
}

export async function updateTraining(id: number, data: Partial<InsertTraining>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(trainings).set(data).where(eq(trainings.id, id));
}

// ============================================================
// SERVICE ORDERS
// ============================================================
export async function listServiceOrders(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) return db.select().from(serviceOrders).where(eq(serviceOrders.employeeId, employeeId)).orderBy(desc(serviceOrders.issueDate));
  return db.select().from(serviceOrders).orderBy(desc(serviceOrders.issueDate));
}

export async function createServiceOrder(data: InsertServiceOrder) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(serviceOrders).values(data);
  return { id: result[0].insertId };
}

// ============================================================
// DOCUMENT TEMPLATES
// ============================================================
export async function listDocumentTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentTemplates).where(eq(documentTemplates.isActive, true)).orderBy(asc(documentTemplates.templateName));
}

export async function getDocumentTemplate(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id)).limit(1);
  return result[0];
}

export async function createDocumentTemplate(data: InsertDocumentTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(documentTemplates).values(data);
  return { id: result[0].insertId };
}

export async function updateDocumentTemplate(id: number, data: Partial<InsertDocumentTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(documentTemplates).set(data).where(eq(documentTemplates.id, id));
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export async function listNotifications(unreadOnly?: boolean) {
  const db = await getDb();
  if (!db) return [];
  if (unreadOnly) return db.select().from(notifications).where(eq(notifications.isRead, false)).orderBy(desc(notifications.createdAt));
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(notifications).values(data);
  return { id: result[0].insertId };
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
}

export async function countUnreadNotifications() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(notifications).where(eq(notifications.isRead, false));
  return result[0]?.count ?? 0;
}

// ============================================================
// HOLIDAYS
// ============================================================
export async function listHolidays() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(holidays).orderBy(asc(holidays.date));
}

export async function createHoliday(data: InsertHoliday) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(holidays).values(data);
  return { id: result[0].insertId };
}

export async function deleteHoliday(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(holidays).where(eq(holidays.id, id));
}

// ============================================================
// SETTINGS
// ============================================================
export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0]?.value;
}

export async function upsertSetting(key: string, value: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(settings).values({ key, value, description: description ?? "" })
    .onDuplicateKeyUpdate({ set: { value } });
}

export async function listSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(settings).orderBy(asc(settings.key));
}

// ============================================================
// AUDIT LOG
// ============================================================
export async function createAuditEntry(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data);
}

export async function listAuditLog(tableName?: string, recordId?: number, cpf?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (tableName) conditions.push(eq(auditLogs.resource, tableName));
  if (recordId) conditions.push(eq(auditLogs.resourceId, recordId));
  if (cpf) conditions.push(eq(auditLogs.cpf, cpf));
  if (conditions.length > 0) return db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.timestamp)).limit(100);
  return db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(100);
}

export async function listAuditLogByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.cpf, cpf)).orderBy(desc(auditLogs.timestamp)).limit(500);
}

// ============================================================
// ABSENCES
// ============================================================
export async function listAbsences(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(absences).where(eq(absences.employeeId, employeeId)).orderBy(desc(absences.absenceDate));
}

export async function createAbsence(data: InsertAbsence) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(absences).values(data);
  return { id: result[0].insertId };
}

export async function countUnjustifiedAbsences(employeeId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(absences)
    .where(and(
      eq(absences.employeeId, employeeId),
      eq(absences.justified, false),
      sql`${absences.absenceDate} >= ${startDate}`,
      sql`${absences.absenceDate} <= ${endDate}`
    ));
  return result[0]?.count ?? 0;
}

// ============================================================
// DEPENDENTS
// ============================================================
export async function listDependents(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dependents).where(eq(dependents.employeeId, employeeId)).orderBy(asc(dependents.name));
}

export async function createDependent(data: InsertDependent) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(dependents).values(data);
  return { id: result[0].insertId };
}

export async function deleteDependent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(dependents).where(eq(dependents.id, id));
}

// ============================================================
// DASHBOARD HELPERS
// ============================================================
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalEmployees: 0, activeEmployees: 0, statusCounts: [], overdueVacations: 0, expiredExams: 0, expiringTimeBank: 0, unreadNotifications: 0, expiredPGR: 0, expiredPCMSO: 0 };

  const today = todayStr();
  const thirtyDays = futureDateStr(30);

  const [totalResult, activeResult, statusCounts, overdueVacResult, expiredExamResult, expiringTBResult, unreadResult, expiredPGRResult, expiredPCMSOResult] = await Promise.all([
    db.select({ count: count() }).from(employees),
    db.select({ count: count() }).from(employees).where(eq(employees.status, "Ativo")),
    db.select({ status: employees.status, count: count() }).from(employees).groupBy(employees.status),
    db.select({ count: count() }).from(vacations).where(and(sql`${vacations.concessionLimit} <= ${today}`, eq(vacations.status, "Pendente"))),
    db.select({ count: count() }).from(medicalExams).where(and(sql`${medicalExams.expiryDate} <= ${today}`, eq(medicalExams.status, "Válido"))),
    db.select({ count: count() }).from(timeBank).where(and(sql`${timeBank.expiryDate} <= ${thirtyDays}`, eq(timeBank.status, "Ativo"))),
    db.select({ count: count() }).from(notifications).where(eq(notifications.isRead, false)),
    db.select({ count: count() }).from(pgr).where(and(sql`${pgr.expiryDate} <= ${thirtyDays}`, eq(pgr.status, "Válido"))),
    db.select({ count: count() }).from(pcmso).where(and(sql`${pcmso.expiryDate} <= ${thirtyDays}`, eq(pcmso.status, "Válido"))),
  ]);

  return {
    totalEmployees: totalResult[0]?.count ?? 0,
    activeEmployees: activeResult[0]?.count ?? 0,
    statusCounts,
    overdueVacations: overdueVacResult[0]?.count ?? 0,
    expiredExams: expiredExamResult[0]?.count ?? 0,
    expiringTimeBank: expiringTBResult[0]?.count ?? 0,
    unreadNotifications: unreadResult[0]?.count ?? 0,
    expiredPGR: expiredPGRResult[0]?.count ?? 0,
    expiredPCMSO: expiredPCMSOResult[0]?.count ?? 0,
  };
}
