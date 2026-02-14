import { eq, desc, asc, and, gte, lte, sql, like, or, count, sum } from "drizzle-orm";
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
  timeRecords, InsertTimeRecord,
  overtimeRecords, InsertOvertimeRecord,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { triggerWebhook, onEmployeeCreated } from './integrations/webhooks';
import { withDBRetry } from './utils/retry';
import { encryptCPF } from './utils/encryption';
import { withTransaction } from './utils/transactions';
import { formatDateTimeBR } from './utils/timezone';
import { nanoid } from 'nanoid';

const generateId = () => nanoid(36);

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
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (search) {
      return db.select().from(employees)
        .where(or(like(employees.fullName, `%${search}%`), like(employees.cpf, `%${search}%`)))
        .orderBy(asc(employees.fullName));
    }
    return db.select().from(employees).orderBy(asc(employees.fullName));
  }, "listEmployees");
}

export async function getEmployee(id: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    return result[0];
  }, "getEmployee");
}

export async function createEmployee(data: InsertEmployee) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(employees).values(data);
      const employeeId = result[0].insertId;
      // Disparar webhook de criação de funcionário
      await onEmployeeCreated({ id: employeeId, ...data });
      // Retornar funcionário completo
      return await getEmployee(employeeId);
    }, "createEmployee");
  }, { name: "createEmployee-transaction" });
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(employees).set(data).where(eq(employees.id, id));
    }, "updateEmployee");
  }, { name: "updateEmployee-transaction" });
}

export async function deleteEmployee(id: number) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.delete(employees).where(eq(employees.id, id));
    }, "deleteEmployee");
  }, { name: "deleteEmployee-transaction" });
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
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(medicalExams)
      .where(and(sql`${medicalExams.expiryDate} <= ${todayStr()}`, eq(medicalExams.status, "Válido")));
  }, "getExpiredExams");
}

export async function getUpcomingExamExpirations(daysAhead: number = 30) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(medicalExams)
      .where(and(
        sql`${medicalExams.expiryDate} >= ${todayStr()}`,
        sql`${medicalExams.expiryDate} <= ${futureDateStr(daysAhead)}`,
        eq(medicalExams.status, "Válido")
      ));
  }, "getUpcomingExamExpirations");
}

// ============================================================
// LEAVES
// ============================================================
export async function listLeaves(employeeId?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (employeeId) return db.select().from(leaves).where(eq(leaves.employeeId, employeeId)).orderBy(desc(leaves.startDate));
    return db.select().from(leaves).orderBy(desc(leaves.startDate));
  }, "listLeaves");
}

export async function createLeave(data: InsertLeave) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(leaves).values(data);
      return { id: result[0].insertId };
    }, "createLeave");
  }, { name: "createLeave-transaction" });
}

export async function updateLeave(id: number, data: Partial<InsertLeave>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(leaves).set(data).where(eq(leaves.id, id));
    }, "updateLeave");
  }, { name: "updateLeave-transaction" });
}

// ============================================================
// TIME BANK
// ============================================================
export async function listTimeBank(employeeId?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (employeeId) return db.select().from(timeBank).where(eq(timeBank.employeeId, employeeId)).orderBy(desc(timeBank.referenceMonth));
    return db.select().from(timeBank).orderBy(desc(timeBank.referenceMonth));
  }, "listTimeBank");
}

export async function createTimeBankEntry(data: InsertTimeBank) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(timeBank).values(data);
      return { id: result[0].insertId };
    }, "createTimeBankEntry");
  }, { name: "createTimeBankEntry-transaction" });
}

export async function updateTimeBankEntry(id: number, data: Partial<InsertTimeBank>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(timeBank).set(data).where(eq(timeBank.id, id));
    }, "updateTimeBankEntry");
  }, { name: "updateTimeBankEntry-transaction" });
}

export async function getExpiringTimeBank(daysAhead: number = 30) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(timeBank)
      .where(and(
        sql`${timeBank.expiryDate} >= ${todayStr()}`,
        sql`${timeBank.expiryDate} <= ${futureDateStr(daysAhead)}`,
        eq(timeBank.status, "Ativo")
      ));
  }, "getExpiringTimeBank");
}

// ============================================================
// BENEFITS
// ============================================================
export async function listBenefits(employeeId?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (employeeId) return db.select().from(benefits).where(eq(benefits.employeeId, employeeId)).orderBy(desc(benefits.startDate));
    return db.select().from(benefits).orderBy(desc(benefits.startDate));
  }, "listBenefits");
}

export async function createBenefit(data: InsertBenefit) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(benefits).values(data);
      return { id: result[0].insertId };
    }, "createBenefit");
  }, { name: "createBenefit-transaction" });
}

export async function updateBenefit(id: number, data: Partial<InsertBenefit>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(benefits).set(data).where(eq(benefits.id, id));
    }, "updateBenefit");
  }, { name: "updateBenefit-transaction" });
}

// ============================================================
// DOCUMENTS (GED)
// ============================================================
export async function listDocuments(employeeId?: number, category?: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (employeeId) conditions.push(eq(documents.employeeId, employeeId));
    if (category) conditions.push(eq(documents.category, category));
    if (conditions.length > 0) return db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.uploadedAt));
    return db.select().from(documents).orderBy(desc(documents.uploadedAt));
  }, "listDocuments");
}

export async function createDocument(data: InsertDocument) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(documents).values(data);
      return { id: result[0].insertId };
    }, "createDocument");
  }, { name: "createDocument-transaction" });
}

export async function deleteDocument(id: number) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.delete(documents).where(eq(documents.id, id));
    }, "deleteDocument");
  }, { name: "deleteDocument-transaction" });
}

// ============================================================
// CHECKLIST ITEMS
// ============================================================
export async function listChecklistItems(employeeId: number, checklistType?: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq(checklistItems.employeeId, employeeId)];
    if (checklistType) conditions.push(eq(checklistItems.checklistType, checklistType));
    return db.select().from(checklistItems).where(and(...conditions)).orderBy(asc(checklistItems.category), asc(checklistItems.id));
  }, "listChecklistItems");
}

export async function createChecklistItem(data: InsertChecklistItem) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(checklistItems).values(data);
      return { id: result[0].insertId };
    }, "createChecklistItem");
  }, { name: "createChecklistItem-transaction" });
}

export async function updateChecklistItem(id: number, data: Partial<InsertChecklistItem>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(checklistItems).set(data).where(eq(checklistItems.id, id));
    }, "updateChecklistItem");
  }, { name: "updateChecklistItem-transaction" });
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
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(equipment).orderBy(asc(equipment.equipmentType));
  }, "listEquipment");
}

export async function createEquipmentItem(data: InsertEquipment) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(equipment).values(data);
      return { id: result[0].insertId };
    }, "createEquipmentItem");
  }, { name: "createEquipmentItem-transaction" });
}

export async function updateEquipmentItem(id: number, data: Partial<InsertEquipment>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(equipment).set(data).where(eq(equipment.id, id));
    }, "updateEquipmentItem");
  }, { name: "updateEquipmentItem-transaction" });
}

// ============================================================
// EQUIPMENT LOANS
// ============================================================
export async function listEquipmentLoans(employeeId?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (employeeId) return db.select().from(equipmentLoans).where(eq(equipmentLoans.employeeId, employeeId)).orderBy(desc(equipmentLoans.loanDate));
    return db.select().from(equipmentLoans).orderBy(desc(equipmentLoans.loanDate));
  }, "listEquipmentLoans");
}

export async function createEquipmentLoan(data: InsertEquipmentLoan) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(equipmentLoans).values(data);
      return { id: result[0].insertId };
    }, "createEquipmentLoan");
  }, { name: "createEquipmentLoan-transaction" });
}

export async function updateEquipmentLoan(id: number, data: Partial<InsertEquipmentLoan>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(equipmentLoans).set(data).where(eq(equipmentLoans.id, id));
    }, "updateEquipmentLoan");
  }, { name: "updateEquipmentLoan-transaction" });
}

// ============================================================
// PPE DELIVERIES (EPIs)
// ============================================================
export async function listPpeDeliveries(employeeId?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (employeeId) return db.select().from(ppeDeliveries).where(eq(ppeDeliveries.employeeId, employeeId)).orderBy(desc(ppeDeliveries.deliveryDate));
    return db.select().from(ppeDeliveries).orderBy(desc(ppeDeliveries.deliveryDate));
  }, "listPpeDeliveries");
}

export async function createPpeDelivery(data: InsertPpeDelivery) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(ppeDeliveries).values(data);
      return { id: result[0].insertId };
    }, "createPpeDelivery");
  }, { name: "createPpeDelivery-transaction" });
}

// ============================================================
// TRAININGS
// ============================================================
export async function listTrainings(employeeId?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (employeeId) return db.select().from(trainings).where(eq(trainings.employeeId, employeeId)).orderBy(desc(trainings.trainingDate));
    return db.select().from(trainings).orderBy(desc(trainings.trainingDate));
  }, "listTrainings");
}

export async function createTraining(data: InsertTraining) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(trainings).values(data);
      return { id: result[0].insertId };
    }, "createTraining");
  }, { name: "createTraining-transaction" });
}

export async function updateTraining(id: number, data: Partial<InsertTraining>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(trainings).set(data).where(eq(trainings.id, id));
    }, "updateTraining");
  }, { name: "updateTraining-transaction" });
}

// ============================================================
// SERVICE ORDERS
// ============================================================
export async function listServiceOrders(employeeId?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (employeeId) return db.select().from(serviceOrders).where(eq(serviceOrders.employeeId, employeeId)).orderBy(desc(serviceOrders.issueDate));
    return db.select().from(serviceOrders).orderBy(desc(serviceOrders.issueDate));
  }, "listServiceOrders");
}

export async function createServiceOrder(data: InsertServiceOrder) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(serviceOrders).values(data);
      return { id: result[0].insertId };
    }, "createServiceOrder");
  }, { name: "createServiceOrder-transaction" });
}

// ============================================================
// DOCUMENT TEMPLATES
// ============================================================
export async function listDocumentTemplates() {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(documentTemplates).where(eq(documentTemplates.isActive, true)).orderBy(asc(documentTemplates.templateName));
  }, "listDocumentTemplates");
}

export async function getDocumentTemplate(id: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id)).limit(1);
    return result[0];
  }, "getDocumentTemplate");
}

export async function createDocumentTemplate(data: InsertDocumentTemplate) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(documentTemplates).values(data);
      return { id: result[0].insertId };
    }, "createDocumentTemplate");
  }, { name: "createDocumentTemplate-transaction" });
}

export async function updateDocumentTemplate(id: number, data: Partial<InsertDocumentTemplate>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(documentTemplates).set(data).where(eq(documentTemplates.id, id));
    }, "updateDocumentTemplate");
  }, { name: "updateDocumentTemplate-transaction" });
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export async function listNotifications(unreadOnly?: boolean) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (unreadOnly) return db.select().from(notifications).where(eq(notifications.isRead, false)).orderBy(desc(notifications.createdAt));
    return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
  }, "listNotifications");
}

export async function createNotification(data: InsertNotification) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(notifications).values(data);
      return { id: result[0].insertId };
    }, "createNotification");
  }, { name: "createNotification-transaction" });
}

export async function markNotificationRead(id: number) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    }, "markNotificationRead");
  }, { name: "markNotificationRead-transaction" });
}

export async function markAllNotificationsRead() {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
    }, "markAllNotificationsRead");
  }, { name: "markAllNotificationsRead-transaction" });
}

export async function countUnreadNotifications() {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return 0;
    const result = await db.select({ count: count() }).from(notifications).where(eq(notifications.isRead, false));
    return result[0]?.count ?? 0;
  }, "countUnreadNotifications");
}

// ============================================================
// HOLIDAYS
// ============================================================
export async function listHolidays() {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(holidays).orderBy(asc(holidays.date));
  }, "listHolidays");
}

export async function createHoliday(data: InsertHoliday) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(holidays).values(data);
      return { id: result[0].insertId };
    }, "createHoliday");
  }, { name: "createHoliday-transaction" });
}

export async function deleteHoliday(id: number) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.delete(holidays).where(eq(holidays.id, id));
    }, "deleteHoliday");
  }, { name: "deleteHoliday-transaction" });
}

// ============================================================
// SETTINGS
// ============================================================
export async function getSetting(key: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return result[0]?.value;
  }, "getSetting");
}

export async function upsertSetting(key: string, value: string, description?: string) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.insert(settings).values({ key, value, description: description ?? "" })
        .onDuplicateKeyUpdate({ set: { value } });
    }, "upsertSetting");
  }, { name: "upsertSetting-transaction" });
}

export async function listSettings() {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(settings).orderBy(asc(settings.key));
  }, "listSettings");
}

// ============================================================
// AUDIT LOG
// ============================================================
export async function createAuditEntry(data: InsertAuditLog) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return;
    // Encriptar CPF se presente
    const auditData = {
      ...data,
      cpf: data.cpf ? encryptCPF(data.cpf) : undefined,
    };
    await db.insert(auditLogs).values(auditData);
  }, "createAuditEntry");
}

export async function listAuditLog(tableName?: string, recordId?: number, cpf?: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (tableName) conditions.push(eq(auditLogs.resource, tableName));
    if (recordId) conditions.push(eq(auditLogs.resourceId, recordId));
    if (cpf) conditions.push(eq(auditLogs.cpf, encryptCPF(cpf)));
    if (conditions.length > 0) return db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.timestamp)).limit(100);
    return db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(100);
  }, "listAuditLog");
}

export async function listAuditLogByCpf(cpf: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(auditLogs).where(eq(auditLogs.cpf, encryptCPF(cpf))).orderBy(desc(auditLogs.timestamp)).limit(500);
  }, "listAuditLogByCpf");
}

// ============================================================
// ABSENCES
// ============================================================
export async function listAbsences(employeeId: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(absences).where(eq(absences.employeeId, employeeId)).orderBy(desc(absences.absenceDate));
  }, "listAbsences");
}

export async function createAbsence(data: InsertAbsence) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(absences).values(data);
      return { id: result[0].insertId };
    }, "createAbsence");
  }, { name: "createAbsence-transaction" });
}

export async function countUnjustifiedAbsences(employeeId: number, startDate: string, endDate: string) {
  return withDBRetry(async () => {
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
  }, "countUnjustifiedAbsences");
}

// ============================================================
// DEPENDENTS
// ============================================================
export async function listDependents(employeeId: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(dependents).where(eq(dependents.employeeId, employeeId)).orderBy(asc(dependents.name));
  }, "listDependents");
}

export async function createDependent(data: InsertDependent) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(dependents).values(data);
      return { id: result[0].insertId };
    }, "createDependent");
  }, { name: "createDependent-transaction" });
}

export async function deleteDependent(id: number) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.delete(dependents).where(eq(dependents.id, id));
    }, "deleteDependent");
  }, { name: "deleteDependent-transaction" });
}

// ============================================================
// DASHBOARD HELPERS
// ============================================================
export async function getDashboardStats() {
  return withDBRetry(async () => {
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
  }, "getDashboardStats");
}

// ============================================================
// TIME RECORDS (CONTROLE DE PONTO)
// ============================================================
export async function createTimeRecord(data: {
  employeeId: string;
  clockIn: Date;
  clockOut?: Date;
  location?: string;
  notes?: string;
}) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      
      const result = await db.insert(timeRecords).values({
        id: nanoid(36),
        employeeId: data.employeeId,
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      return { success: true, id: result[0]?.insertId };
    }, "createTimeRecord");
  }, { name: "createTimeRecord-transaction" });
}

export async function listTimeRecords(
  employeeId: string,
  startDate?: Date,
  endDate?: Date
) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    
    let query = db.select().from(timeRecords).where(eq(timeRecords.employeeId, employeeId));
    
    if (startDate && endDate) {
      query = query.where(
        and(
          sql`${timeRecords.clockIn} >= ${startDate}`,
          sql`${timeRecords.clockIn} <= ${endDate}`
        )
      );
    }
    
    return query.orderBy(desc(timeRecords.clockIn));
  }, "listTimeRecords");
}

export async function getTimeRecord(id: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return null;
    
    const result = await db.select().from(timeRecords).where(eq(timeRecords.id, id));
    return result[0] || null;
  }, "getTimeRecord");
}

export async function updateTimeRecord(id: string, data: Record<string, any>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      
      await db.update(timeRecords)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(timeRecords.id, id));
      
      return { success: true };
    }, "updateTimeRecord");
  }, { name: "updateTimeRecord-transaction" });
}

export async function getMonthlyTimeSummary(
  employeeId: string,
  month: number,
  year: number
) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return { totalHours: 0, overtimeHours: 0, absences: 0, delays: 0 };
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const records = await db.select().from(timeRecords)
      .where(
        and(
          eq(timeRecords.employeeId, employeeId),
          sql`${timeRecords.clockIn} >= ${startDate}`,
          sql`${timeRecords.clockIn} <= ${endDate}`
        )
      );
    
    let totalHours = 0;
    records.forEach(record => {
      if (record.clockIn && record.clockOut) {
        const hours = (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
    return {
      totalHours: Math.round(totalHours * 100) / 100,
      overtimeHours: 0,
      absences: 0,
      delays: 0,
    };
  }, "getMonthlyTimeSummary");
}

// ============================================================
// OVERTIME RECORDS (HORAS EXTRAS)
// ============================================================
export async function createOvertimeRequest(data: {
  employeeId: string;
  timeRecordId: string;
  overtimeHours: number;
  type: "50%" | "100%" | "NOTURNO";
  reason?: string;
}) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      
      const multipliers: Record<string, number> = {
        "50%": 1.5,
        "100%": 2.0,
        "NOTURNO": 1.2,
      };
      
      const multiplier = multipliers[data.type];
      
      const result = await db.insert(overtimeRecords).values({
        id: nanoid(36),
        employeeId: data.employeeId,
        timeRecordId: data.timeRecordId,
        overtimeHours: data.overtimeHours,
        multiplier,
        type: data.type,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      return { success: true, id: result[0]?.insertId };
    }, "createOvertimeRequest");
  }, { name: "createOvertimeRequest-transaction" });
}

export async function listOvertimeRequests(
  employeeId?: string,
  status?: "PENDING" | "APPROVED" | "REJECTED"
) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    
    let query = db.select().from(overtimeRecords);
    
    if (employeeId) {
      query = query.where(eq(overtimeRecords.employeeId, employeeId));
    }
    
    if (status) {
      query = query.where(eq(overtimeRecords.status, status));
    }
    
    return query.orderBy(desc(overtimeRecords.createdAt));
  }, "listOvertimeRequests");
}

export async function updateOvertimeRequest(id: string, data: Record<string, any>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      
      await db.update(overtimeRecords)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(overtimeRecords.id, id));
      
      return { success: true };
    }, "updateOvertimeRequest");
  }, { name: "updateOvertimeRequest-transaction" });
}

export async function getOvertimeStats(
  employeeId?: string,
  month?: number,
  year?: number
) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return {
      totalRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      pendingRequests: 0,
      totalOvertimeHours: 0,
      totalOvertimeValue: 0,
    };
    
    let query = db.select({
      status: overtimeRecords.status,
      count: count(),
      totalHours: sum(overtimeRecords.overtimeHours),
      totalValue: sum(sql`${overtimeRecords.overtimeHours} * ${overtimeRecords.multiplier}`),
    }).from(overtimeRecords).groupBy(overtimeRecords.status);
    
    if (employeeId) {
      query = query.where(eq(overtimeRecords.employeeId, employeeId));
    }
    
    const results = await query;
    
    let totalRequests = 0;
    let approvedRequests = 0;
    let rejectedRequests = 0;
    let pendingRequests = 0;
    let totalOvertimeHours = 0;
    let totalOvertimeValue = 0;
    
    results.forEach(row => {
      totalRequests += row.count || 0;
      if (row.status === "APPROVED") approvedRequests += row.count || 0;
      if (row.status === "REJECTED") rejectedRequests += row.count || 0;
      if (row.status === "PENDING") pendingRequests += row.count || 0;
      totalOvertimeHours += (row.totalHours as number) || 0;
      totalOvertimeValue += (row.totalValue as number) || 0;
    });
    
    return {
      totalRequests,
      approvedRequests,
      rejectedRequests,
      pendingRequests,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      totalOvertimeValue: Math.round(totalOvertimeValue * 100) / 100,
    };
  }, "getOvertimeStats");
}
