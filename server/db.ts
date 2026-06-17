import { eq, desc, asc, and, gte, lte, sql, like, or, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
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
  jobOpenings, InsertJobOpening,
  candidates, InsertCandidate,
  overtimeAuthorizations, InsertOvertimeAuthorization,
  complianceExports, InsertComplianceExport,
  departments, InsertDepartment,
  employeeManagerHistory, InsertEmployeeManagerHistory,
  admissionWorkflows, InsertAdmissionWorkflow,
  admissionChecklistItems, InsertAdmissionChecklistItem,
  employeeMovements, InsertEmployeeMovement,
  terminations, InsertTermination,
  terminationDevolutionItems, InsertTerminationDevolutionItem,
  requests as requestsTable, InsertRequest,
  approvals, InsertApproval,
  consentRecords, InsertConsentRecord,
  readAuditLogs, InsertReadAuditLog,
} from "../drizzle/schema.js";
import { ENV } from './_core/env.js';
import { isLocalDevUsersEnabled, localDevUsers } from "./_core/local-dev-users.js";
import { triggerWebhook, onEmployeeCreated } from './integrations/webhooks.js';
import { withDBRetry } from './utils/retry.js';
import { encryptCPF } from './utils/encryption.js';
import { withTransaction } from './utils/transactions.js';
import { formatDateTimeBR } from './utils/timezone.js';
import { isFeatureEnabled } from "./_core/feature-flags.js";
import { nanoid } from 'nanoid';

const generateId = () => nanoid(36);

let _db: ReturnType<typeof drizzle> | null = null;

let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const needsTls = /tidbcloud\.com|sslmode=require|ssl=true/i.test(url);
    _pool = mysql.createPool({
      uri: url,
      connectionLimit: Number(process.env.DB_POOL_LIMIT ?? 15),
      idleTimeout: 30_000,
      enableKeepAlive: true,
      ...(needsTls
        ? {
            ssl: {
              minVersion: "TLSv1.2",
              rejectUnauthorized: true,
            },
          }
        : {}),
    });
    _db = drizzle(_pool);
    return _db;
  } catch (error) {
    console.error("[Database] Failed to initialize drizzle:", error);
    throw error;
  }
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
  if (isLocalDevUsersEnabled()) {
    await localDevUsers.upsertUser({
      email: user.email,
      openId: user.openId,
      name: user.name,
      loginMethod: user.loginMethod,
      role: user.role,
      passwordHash: user.passwordHash,
    });
    return;
  }
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
  if (isLocalDevUsersEnabled()) {
    return localDevUsers.getUserByOpenId(openId);
  }
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

// ============================================================
// ANALYTICS OPERACIONAIS — Fase 6
// ============================================================
export async function getPendingByManager() {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    const result = await conn.execute(sql`
      SELECT
        m.id AS manager_id,
        m.fullName AS manager_name,
        COUNT(DISTINCT r.id) AS pending_requests,
        COUNT(DISTINCT t.id) AS pending_time_records,
        (COUNT(DISTINCT r.id) + COUNT(DISTINCT t.id)) AS total_pending
      FROM employees e
      INNER JOIN employees m ON e.manager_id = m.id
      LEFT JOIN requests r ON r.employee_id = e.id AND r.status = 'PENDING'
      LEFT JOIN time_records t ON t.employee_id = e.id AND t.status = 'PENDING'
      GROUP BY m.id, m.fullName
      HAVING total_pending > 0
      ORDER BY total_pending DESC
      LIMIT 50
    `);
    const rows = (result as any)[0] ?? result;
    return (rows as any[]).map((r) => ({
      managerId: r.manager_id,
      managerName: r.manager_name,
      pendingRequests: Number(r.pending_requests) || 0,
      pendingTimeRecords: Number(r.pending_time_records) || 0,
      totalPending: Number(r.total_pending) || 0,
    }));
  }, "getPendingByManager");
}

export async function getApprovalLatency(days: number = 30) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return { medianHours: 0, avgHours: 0, totalApproved: 0 };
    const result = await conn.execute(sql`
      SELECT
        AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) AS avg_hours,
        COUNT(*) AS total_approved
      FROM requests
      WHERE status = 'APPROVED'
        AND resolved_at IS NOT NULL
        AND created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    `);
    const rows = (result as any)[0] ?? result;
    const r = rows[0] ?? {};
    return {
      avgHours: Math.round((Number(r.avg_hours) || 0) * 10) / 10,
      totalApproved: Number(r.total_approved) || 0,
    };
  }, "getApprovalLatency");
}

export async function getHourBankDistribution() {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    const result = await conn.execute(sql`
      SELECT
        e.id AS employee_id,
        e.fullName AS employee_name,
        COALESCE(SUM(CAST(tb.hoursBalance AS DECIMAL(10,2))), 0) AS total_balance
      FROM employees e
      LEFT JOIN time_bank tb ON tb.employeeId = e.id AND tb.status = 'Ativo'
      WHERE e.status = 'Ativo'
      GROUP BY e.id, e.fullName
      HAVING total_balance != 0
      ORDER BY total_balance DESC
      LIMIT 100
    `);
    const rows = (result as any)[0] ?? result;
    return (rows as any[]).map((r) => ({
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      totalBalance: Number(r.total_balance) || 0,
    }));
  }, "getHourBankDistribution");
}

export async function getTardinessByDepartment(months: number = 3) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    const result = await conn.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COUNT(DISTINCT t.id) AS tardiness_count,
        COUNT(DISTINCT e.id) AS employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'Ativo'
      LEFT JOIN time_records t ON t.employee_id = e.id
        AND t.status = 'PENDING'
        AND t.notes LIKE '%Atraso%'
        AND t.created_at >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
      WHERE d.active = 1
      GROUP BY d.id, d.name
      ORDER BY tardiness_count DESC
    `);
    const rows = (result as any)[0] ?? result;
    return (rows as any[]).map((r) => ({
      departmentId: r.department_id,
      departmentName: r.department_name,
      tardinessCount: Number(r.tardiness_count) || 0,
      employeeCount: Number(r.employee_count) || 0,
    }));
  }, "getTardinessByDepartment");
}

export async function getDocumentComplianceRate() {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return { totalEmployees: 0, withCompleteAdmission: 0, rate: 0 };
    const result = await conn.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM employees WHERE status = 'Ativo') AS total,
        (SELECT COUNT(DISTINCT result_employee_id)
         FROM admission_workflows
         WHERE status = 'ACTIVE' AND result_employee_id IS NOT NULL) AS with_admission
    `);
    const rows = (result as any)[0] ?? result;
    const r = rows[0] ?? {};
    const total = Number(r.total) || 0;
    const withAdm = Number(r.with_admission) || 0;
    return {
      totalEmployees: total,
      withCompleteAdmission: withAdm,
      rate: total > 0 ? Math.round((withAdm / total) * 1000) / 10 : 0,
    };
  }, "getDocumentComplianceRate");
}

export async function getVacationDeadlineRisks() {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    const result = await conn.execute(sql`
      SELECT
        v.id AS vacation_id,
        v.employeeId AS employee_id,
        e.fullName AS employee_name,
        v.concessionLimit AS concession_limit,
        DATEDIFF(v.concessionLimit, CURDATE()) AS days_remaining
      FROM vacations v
      INNER JOIN employees e ON e.id = v.employeeId
      WHERE v.status = 'Pendente'
        AND v.concessionLimit IS NOT NULL
        AND v.concessionLimit <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
      ORDER BY v.concessionLimit ASC
      LIMIT 50
    `);
    const rows = (result as any)[0] ?? result;
    return (rows as any[]).map((r) => ({
      vacationId: r.vacation_id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      concessionLimit: r.concession_limit,
      daysRemaining: Number(r.days_remaining) || 0,
    }));
  }, "getVacationDeadlineRisks");
}

export async function getTurnoverMonthly(months: number = 12) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT
        DATE_FORMAT(month_date, '%Y-%m') AS ym,
        SUM(CASE WHEN type = 'hire' THEN 1 ELSE 0 END) AS hires,
        SUM(CASE WHEN type = 'termination' THEN 1 ELSE 0 END) AS terminations
      FROM (
        SELECT DATE_FORMAT(hireDate, '%Y-%m-01') AS month_date, 'hire' AS type FROM contracts WHERE hireDate IS NOT NULL
        UNION ALL
        SELECT DATE_FORMAT(terminationDate, '%Y-%m-01') AS month_date, 'termination' AS type FROM contracts WHERE terminationDate IS NOT NULL
      ) t
      WHERE month_date >= DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL ${months} MONTH), '%Y-%m-01')
      GROUP BY ym
      ORDER BY ym
    `);
    const rows = (result as any)[0] ?? result;
    return (rows as any[]).map((r) => ({
      month: r.ym,
      hires: Number(r.hires) || 0,
      terminations: Number(r.terminations) || 0,
    }));
  }, "getTurnoverMonthly");
}

export async function getAbsenteeismMonthly(months: number = 12) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT
        DATE_FORMAT(absenceDate, '%Y-%m') AS ym,
        COUNT(*) AS total,
        SUM(CASE WHEN justified = 1 THEN 1 ELSE 0 END) AS justified,
        SUM(CASE WHEN justified = 0 THEN 1 ELSE 0 END) AS unjustified
      FROM absences
      WHERE absenceDate >= DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL ${months} MONTH), '%Y-%m-01')
      GROUP BY ym
      ORDER BY ym
    `);
    const rows = (result as any)[0] ?? result;
    return (rows as any[]).map((r) => ({
      month: r.ym,
      total: Number(r.total) || 0,
      justified: Number(r.justified) || 0,
      unjustified: Number(r.unjustified) || 0,
    }));
  }, "getAbsenteeismMonthly");
}

export async function getHeadcountEvolution(months: number = 12) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.execute(sql`
      WITH RECURSIVE month_series AS (
        SELECT DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL ${months} MONTH), '%Y-%m-01') AS month_start
        UNION ALL
        SELECT DATE_ADD(month_start, INTERVAL 1 MONTH) FROM month_series
        WHERE month_start < DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
      )
      SELECT
        DATE_FORMAT(ms.month_start, '%Y-%m') AS ym,
        (
          SELECT COUNT(*) FROM contracts c
          WHERE c.hireDate <= LAST_DAY(ms.month_start)
            AND (c.terminationDate IS NULL OR c.terminationDate > LAST_DAY(ms.month_start))
        ) AS active
      FROM month_series ms
      ORDER BY ms.month_start
    `);
    const rows = (result as any)[0] ?? result;
    return (rows as any[]).map((r) => ({ month: r.ym, active: Number(r.active) || 0 }));
  }, "getHeadcountEvolution");
}

// ============================================================
// OVERTIME AUTHORIZATIONS (Pré-autorização de horas extras)
// ============================================================
export async function listOvertimeAuthorizations(filter?: { employeeId?: number; date?: string; consumed?: boolean }) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const conds: any[] = [];
    if (filter?.employeeId) conds.push(eq(overtimeAuthorizations.employeeId, filter.employeeId));
    if (filter?.date) conds.push(eq(overtimeAuthorizations.authorizedDate, filter.date as any));
    if (filter?.consumed !== undefined) conds.push(eq(overtimeAuthorizations.consumed, filter.consumed));
    if (conds.length > 0) {
      return db.select().from(overtimeAuthorizations).where(and(...conds)).orderBy(desc(overtimeAuthorizations.authorizedDate));
    }
    return db.select().from(overtimeAuthorizations).orderBy(desc(overtimeAuthorizations.authorizedDate)).limit(200);
  }, "listOvertimeAuthorizations");
}

export async function createOvertimeAuthorization(data: InsertOvertimeAuthorization) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const r = await db.insert(overtimeAuthorizations).values(data);
      return { id: r[0].insertId };
    }, "createOvertimeAuthorization");
  }, { name: "createOvertimeAuthorization-transaction" });
}

export async function findOvertimeAuthorizationFor(employeeId: number, date: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return null;
    const r = await db
      .select()
      .from(overtimeAuthorizations)
      .where(and(
        eq(overtimeAuthorizations.employeeId, employeeId),
        eq(overtimeAuthorizations.authorizedDate, date as any),
        eq(overtimeAuthorizations.consumed, false)
      ))
      .limit(1);
    return r[0] ?? null;
  }, "findOvertimeAuthorizationFor");
}

export async function consumeOvertimeAuthorization(id: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return;
    await db.update(overtimeAuthorizations).set({ consumed: true }).where(eq(overtimeAuthorizations.id, id));
  }, "consumeOvertimeAuthorization");
}

export async function bulkUpdateTimeRecordStatus(ids: number[], status: "PENDING" | "APPROVED" | "REJECTED", approvedById?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return { updated: 0 };
    if (ids.length === 0) return { updated: 0 };
    await db
      .update(timeRecords)
      .set({
        status,
        approvedById,
        approvedAt: new Date(),
      })
      .where(sql`${timeRecords.id} IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})`);
    return { updated: ids.length };
  }, "bulkUpdateTimeRecordStatus");
}

export async function listAllTimeRecords(startDate: Date, endDate: Date) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: timeRecords.id,
        employeeId: timeRecords.employeeId,
        clockIn: timeRecords.clockIn,
        clockOut: timeRecords.clockOut,
        hoursWorked: timeRecords.hoursWorked,
        status: timeRecords.status,
        nsr: timeRecords.nsr,
        recordHash: timeRecords.recordHash,
        previousHash: timeRecords.previousHash,
        cpf: employees.cpf,
        fullName: employees.fullName,
      })
      .from(timeRecords)
      .innerJoin(employees, eq(timeRecords.employeeId, employees.id))
      .where(and(
        sql`${timeRecords.clockIn} >= ${startDate}`,
        sql`${timeRecords.clockIn} <= ${endDate}`,
      ))
      .orderBy(asc(timeRecords.nsr), asc(timeRecords.clockIn));
  }, "listAllTimeRecords");
}

export async function listComplianceExports() {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(complianceExports).orderBy(desc(complianceExports.generatedAt)).limit(100);
  }, "listComplianceExports");
}

export async function recordComplianceExport(data: InsertComplianceExport) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return { id: 0 };
    const r = await db.insert(complianceExports).values(data);
    return { id: r[0].insertId };
  }, "recordComplianceExport");
}

export async function getTimesheetReport(employeeId: number, startDate: Date, endDate: Date) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(timeRecords)
      .where(and(
        eq(timeRecords.employeeId, employeeId),
        sql`${timeRecords.clockIn} >= ${startDate}`,
        sql`${timeRecords.clockIn} <= ${endDate}`,
      ))
      .orderBy(asc(timeRecords.clockIn));
  }, "getTimesheetReport");
}

// ============================================================
// JOB OPENINGS (Vagas)
// ============================================================
export async function listJobOpenings(status?: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const query = db.select().from(jobOpenings).orderBy(desc(jobOpenings.openedAt));
    if (status) return query.where(eq(jobOpenings.status, status as any));
    return query;
  }, "listJobOpenings");
}

export async function getJobOpening(id: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return null;
    const r = await db.select().from(jobOpenings).where(eq(jobOpenings.id, id)).limit(1);
    return r[0] ?? null;
  }, "getJobOpening");
}

export async function createJobOpening(data: InsertJobOpening) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const r = await db.insert(jobOpenings).values(data);
      return { id: r[0].insertId };
    }, "createJobOpening");
  }, { name: "createJobOpening-transaction" });
}

export async function updateJobOpening(id: number, data: Partial<InsertJobOpening>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(jobOpenings).set(data).where(eq(jobOpenings.id, id));
    }, "updateJobOpening");
  }, { name: "updateJobOpening-transaction" });
}

// ============================================================
// CANDIDATES
// ============================================================
export async function listCandidates(jobOpeningId?: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    if (jobOpeningId) {
      return db.select().from(candidates)
        .where(eq(candidates.jobOpeningId, jobOpeningId))
        .orderBy(desc(candidates.appliedAt));
    }
    return db.select().from(candidates).orderBy(desc(candidates.appliedAt));
  }, "listCandidates");
}

export async function getCandidate(id: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return null;
    const r = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
    return r[0] ?? null;
  }, "getCandidate");
}

export async function createCandidate(data: InsertCandidate) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const r = await db.insert(candidates).values(data);
      return { id: r[0].insertId };
    }, "createCandidate");
  }, { name: "createCandidate-transaction" });
}

export async function updateCandidate(id: number, data: Partial<InsertCandidate>) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(candidates).set(data).where(eq(candidates.id, id));
    }, "updateCandidate");
  }, { name: "updateCandidate-transaction" });
}

// ============================================================
// DEPARTMENTS + HIERARCHY
// ============================================================
export async function listDepartments() {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(departments).orderBy(asc(departments.name));
  }, "listDepartments");
}

export async function createDepartment(data: InsertDepartment) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const r = await db.insert(departments).values(data);
      return { id: r[0].insertId };
    }, "createDepartment");
  }, { name: "createDepartment-transaction" });
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    await db.update(departments).set(data).where(eq(departments.id, id));
    return { success: true };
  }, "updateDepartment");
}

export async function deleteDepartment(id: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    await db.delete(departments).where(eq(departments.id, id));
    return { success: true };
  }, "deleteDepartment");
}

const SUBORDINATES_CACHE = new Map<number, { ids: Set<number>; cachedAt: number }>();
const SUBORDINATES_TTL_MS = 60_000;

export async function getSubordinatesRecursive(managerId: number): Promise<Set<number>> {
  const cached = SUBORDINATES_CACHE.get(managerId);
  if (cached && Date.now() - cached.cachedAt < SUBORDINATES_TTL_MS) {
    return cached.ids;
  }
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return new Set<number>();
    const result = await db.execute(sql`
      WITH RECURSIVE tree AS (
        SELECT id FROM employees WHERE manager_id = ${managerId}
        UNION ALL
        SELECT e.id FROM employees e INNER JOIN tree t ON e.manager_id = t.id
      )
      SELECT id FROM tree
    `);
    const rows = (result as any)[0] ?? result;
    const ids = new Set<number>((rows as any[]).map((r) => Number(r.id)));
    SUBORDINATES_CACHE.set(managerId, { ids, cachedAt: Date.now() });
    return ids;
  }, "getSubordinatesRecursive");
}

export function invalidateSubordinatesCache(managerId?: number) {
  if (managerId === undefined) SUBORDINATES_CACHE.clear();
  else SUBORDINATES_CACHE.delete(managerId);
}

export async function setEmployeeManager(employeeId: number, managerId: number | null, changedById?: number, reason?: string) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const current = await db.select({ managerId: employees.managerId }).from(employees).where(eq(employees.id, employeeId)).limit(1);
      const previousManagerId = current[0]?.managerId ?? null;

      if (previousManagerId === managerId) return { success: true, unchanged: true };

      // Fecha histórico anterior
      if (previousManagerId !== null) {
        await db.update(employeeManagerHistory)
          .set({ endDate: new Date() })
          .where(and(
            eq(employeeManagerHistory.employeeId, employeeId),
            sql`${employeeManagerHistory.endDate} IS NULL`
          ));
      }

      // Atualiza employees.manager_id
      await db.update(employees).set({ managerId }).where(eq(employees.id, employeeId));

      // Insere novo histórico
      await db.insert(employeeManagerHistory).values({
        employeeId,
        managerId,
        startDate: new Date(),
        changedById,
        reason,
      });

      // Invalida cache (gestor antigo + novo)
      invalidateSubordinatesCache();

      return { success: true };
    }, "setEmployeeManager");
  }, { name: "setEmployeeManager-transaction" });
}

export async function listEmployeeManagerHistory(employeeId: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(employeeManagerHistory)
      .where(eq(employeeManagerHistory.employeeId, employeeId))
      .orderBy(desc(employeeManagerHistory.startDate));
  }, "listEmployeeManagerHistory");
}

// ============================================================
// LIFECYCLE — Admissão
// ============================================================
const DEFAULT_ADMISSION_CHECKLIST: Array<{ category: string; itemDescription: string; required: boolean }> = [
  { category: "Documentos Pessoais", itemDescription: "Cópia do RG", required: true },
  { category: "Documentos Pessoais", itemDescription: "Cópia do CPF", required: true },
  { category: "Documentos Pessoais", itemDescription: "Comprovante de residência", required: true },
  { category: "Documentos Pessoais", itemDescription: "Foto 3x4", required: false },
  { category: "Documentos Pessoais", itemDescription: "Certidão de nascimento ou casamento", required: false },
  { category: "Admissão e Registro CLT", itemDescription: "CTPS (digital ou física)", required: true },
  { category: "Admissão e Registro CLT", itemDescription: "Título de eleitor", required: true },
  { category: "Admissão e Registro CLT", itemDescription: "PIS/PASEP", required: true },
  { category: "Admissão e Registro CLT", itemDescription: "Dados bancários / chave PIX", required: true },
  { category: "Admissão e Registro CLT", itemDescription: "Termo de opção de vale-transporte", required: false },
  { category: "Admissão e Registro CLT", itemDescription: "Reservista (se aplicável)", required: false },
  { category: "Saúde e Segurança", itemDescription: "ASO Admissional", required: true },
  { category: "Saúde e Segurança", itemDescription: "Ordem de Serviço (NR-1) assinada", required: true },
  { category: "Saúde e Segurança", itemDescription: "Ficha de entrega de EPI", required: false },
  { category: "Termos e Ciência", itemDescription: "Contrato CLT assinado", required: true },
  { category: "Termos e Ciência", itemDescription: "Regulamento interno (ciência)", required: true },
  { category: "Termos e Ciência", itemDescription: "Termo de confidencialidade", required: true },
];

export async function listAdmissionWorkflows(filter?: { status?: string }) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    if (filter?.status) {
      return conn.select().from(admissionWorkflows)
        .where(eq(admissionWorkflows.status, filter.status as any))
        .orderBy(desc(admissionWorkflows.startedAt));
    }
    return conn.select().from(admissionWorkflows).orderBy(desc(admissionWorkflows.startedAt));
  }, "listAdmissionWorkflows");
}

export async function getAdmissionWorkflow(id: number) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return null;
    const r = await conn.select().from(admissionWorkflows).where(eq(admissionWorkflows.id, id)).limit(1);
    return r[0] ?? null;
  }, "getAdmissionWorkflow");
}

export async function createAdmissionWorkflow(
  data: InsertAdmissionWorkflow,
  options?: { populateDefaultChecklist?: boolean }
) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const conn = await getDb();
      if (!conn) throw new Error("DB not available");
      const r = await conn.insert(admissionWorkflows).values(data);
      const workflowId = r[0].insertId;
      if (options?.populateDefaultChecklist !== false) {
        for (const item of DEFAULT_ADMISSION_CHECKLIST) {
          await conn.insert(admissionChecklistItems).values({
            workflowId,
            category: item.category,
            itemDescription: item.itemDescription,
            required: item.required,
          });
        }
      }
      return { id: workflowId };
    }, "createAdmissionWorkflow");
  }, { name: "createAdmissionWorkflow-transaction" });
}

export async function updateAdmissionWorkflow(id: number, data: Partial<InsertAdmissionWorkflow>) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    await conn.update(admissionWorkflows).set(data).where(eq(admissionWorkflows.id, id));
    return { success: true };
  }, "updateAdmissionWorkflow");
}

export async function listAdmissionChecklist(workflowId: number) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    return conn.select().from(admissionChecklistItems)
      .where(eq(admissionChecklistItems.workflowId, workflowId))
      .orderBy(asc(admissionChecklistItems.category), asc(admissionChecklistItems.id));
  }, "listAdmissionChecklist");
}

export async function updateAdmissionChecklistItem(id: number, data: Partial<InsertAdmissionChecklistItem>) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    await conn.update(admissionChecklistItems).set(data).where(eq(admissionChecklistItems.id, id));
    return { success: true };
  }, "updateAdmissionChecklistItem");
}

// ============================================================
// LIFECYCLE — Movimentação
// ============================================================
export async function listEmployeeMovements(employeeId: number) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    return conn.select().from(employeeMovements)
      .where(eq(employeeMovements.employeeId, employeeId))
      .orderBy(desc(employeeMovements.effectiveDate));
  }, "listEmployeeMovements");
}

export async function createEmployeeMovement(data: InsertEmployeeMovement) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    const r = await conn.insert(employeeMovements).values(data);
    return { id: r[0].insertId };
  }, "createEmployeeMovement");
}

// ============================================================
// LIFECYCLE — Desligamento
// ============================================================
const DEFAULT_DEVOLUTION_CHECKLIST: string[] = [
  "Crachá / cartão de acesso",
  "Notebook / desktop",
  "Celular corporativo",
  "EPIs (capacete, óculos, etc.)",
  "Chaves / cartões de estacionamento",
  "Uniforme / fardamento",
  "Material e ferramentas operacionais",
  "Token / smartcard",
];

export async function listTerminations(filter?: { status?: string }) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    if (filter?.status) {
      return conn.select().from(terminations)
        .where(eq(terminations.status, filter.status as any))
        .orderBy(desc(terminations.initiatedAt));
    }
    return conn.select().from(terminations).orderBy(desc(terminations.initiatedAt));
  }, "listTerminations");
}

export async function getTermination(id: number) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return null;
    const r = await conn.select().from(terminations).where(eq(terminations.id, id)).limit(1);
    return r[0] ?? null;
  }, "getTermination");
}

export async function createTermination(data: InsertTermination) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const conn = await getDb();
      if (!conn) throw new Error("DB not available");
      const r = await conn.insert(terminations).values(data);
      const terminationId = r[0].insertId;
      for (const item of DEFAULT_DEVOLUTION_CHECKLIST) {
        await conn.insert(terminationDevolutionItems).values({
          terminationId,
          itemDescription: item,
        });
      }
      return { id: terminationId };
    }, "createTermination");
  }, { name: "createTermination-transaction" });
}

export async function updateTermination(id: number, data: Partial<InsertTermination>) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    await conn.update(terminations).set(data).where(eq(terminations.id, id));
    return { success: true };
  }, "updateTermination");
}

export async function listTerminationDevolution(terminationId: number) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    return conn.select().from(terminationDevolutionItems)
      .where(eq(terminationDevolutionItems.terminationId, terminationId))
      .orderBy(asc(terminationDevolutionItems.id));
  }, "listTerminationDevolution");
}

export async function updateTerminationDevolutionItem(id: number, data: Partial<InsertTerminationDevolutionItem>) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    await conn.update(terminationDevolutionItems).set(data).where(eq(terminationDevolutionItems.id, id));
    return { success: true };
  }, "updateTerminationDevolutionItem");
}

// ============================================================
// REQUESTS / INBOX
// ============================================================
const SLA_DEFAULT_DAYS: Record<string, number> = {
  ferias: 7,
  atestado: 5,
  ajuste_ponto: 3,
  abono: 5,
  horas_extras: 2,
  declaracao: 7,
  adiantamento: 3,
  outro: 7,
};

export async function createRequest(data: InsertRequest) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    const slaDays = SLA_DEFAULT_DAYS[data.kind as string] ?? 5;
    const slaDueAt = data.slaDueAt ?? new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000);
    const r = await conn.insert(requestsTable).values({ ...data, slaDueAt } as any);
    return { id: r[0].insertId };
  }, "createRequest");
}

export async function listRequests(filter?: {
  employeeId?: number;
  employeeIds?: number[];
  status?: string;
  kind?: string;
}) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    const conds: any[] = [];
    if (filter?.employeeId) conds.push(eq(requestsTable.employeeId, filter.employeeId));
    if (filter?.employeeIds && filter.employeeIds.length > 0) {
      conds.push(sql`${requestsTable.employeeId} IN (${sql.join(filter.employeeIds.map((i) => sql`${i}`), sql`, `)})`);
    }
    if (filter?.status) conds.push(eq(requestsTable.status, filter.status as any));
    if (filter?.kind) conds.push(eq(requestsTable.kind, filter.kind as any));

    const query = conn.select().from(requestsTable);
    if (conds.length > 0) {
      return query.where(and(...conds)).orderBy(desc(requestsTable.priority), asc(requestsTable.slaDueAt), desc(requestsTable.createdAt)).limit(200);
    }
    return query.orderBy(desc(requestsTable.priority), asc(requestsTable.slaDueAt), desc(requestsTable.createdAt)).limit(200);
  }, "listRequests");
}

export async function getRequest(id: number) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return null;
    const r = await conn.select().from(requestsTable).where(eq(requestsTable.id, id)).limit(1);
    return r[0] ?? null;
  }, "getRequest");
}

export async function updateRequest(id: number, data: Partial<InsertRequest>) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    await conn.update(requestsTable).set(data).where(eq(requestsTable.id, id));
    return { success: true };
  }, "updateRequest");
}

export async function listApprovals(requestId: number) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    return conn.select().from(approvals).where(eq(approvals.requestId, requestId)).orderBy(asc(approvals.level));
  }, "listApprovals");
}

export async function createApproval(data: InsertApproval) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    const r = await conn.insert(approvals).values(data);
    return { id: r[0].insertId };
  }, "createApproval");
}

// ============================================================
// CONSENT (LGPD)
// ============================================================
export async function listUserConsents(userId: number) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    return conn.select().from(consentRecords)
      .where(eq(consentRecords.userId, userId))
      .orderBy(desc(consentRecords.createdAt));
  }, "listUserConsents");
}

export async function getActiveConsent(userId: number, consentType: string) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return null;
    const r = await conn.select().from(consentRecords)
      .where(and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.consentType, consentType as any),
        sql`${consentRecords.revokedAt} IS NULL`
      ))
      .orderBy(desc(consentRecords.createdAt))
      .limit(1);
    return r[0] ?? null;
  }, "getActiveConsent");
}

export async function recordConsent(data: InsertConsentRecord) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    // Revoga consents ativos do mesmo tipo antes (1 ativo por tipo/user)
    await conn.update(consentRecords)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(consentRecords.userId, data.userId as number),
        eq(consentRecords.consentType, data.consentType as any),
        sql`${consentRecords.revokedAt} IS NULL`
      ));
    const r = await conn.insert(consentRecords).values(data);
    return { id: r[0].insertId };
  }, "recordConsent");
}

export async function revokeConsent(userId: number, consentType: string) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB not available");
    await conn.update(consentRecords)
      .set({ revokedAt: new Date(), accepted: false })
      .where(and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.consentType, consentType as any),
        sql`${consentRecords.revokedAt} IS NULL`
      ));
    return { success: true };
  }, "revokeConsent");
}

// ============================================================
// READ AUDIT (logs de leitura sensível)
// ============================================================
export async function recordReadAudit(data: InsertReadAuditLog) {
  // Async, fire-and-forget — não bloqueia response
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return;
    await conn.insert(readAuditLogs).values(data);
  }, "recordReadAudit").catch(() => {/* silent */});
}

export async function listReadAuditLogs(filter?: {
  actorUserId?: number;
  targetEmployeeId?: number;
  resource?: string;
  limit?: number;
}) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return [];
    const conds: any[] = [];
    if (filter?.actorUserId) conds.push(eq(readAuditLogs.actorUserId, filter.actorUserId));
    if (filter?.targetEmployeeId) conds.push(eq(readAuditLogs.targetEmployeeId, filter.targetEmployeeId));
    if (filter?.resource) conds.push(eq(readAuditLogs.resource, filter.resource));
    const limit = filter?.limit ?? 200;
    if (conds.length > 0) {
      return conn.select().from(readAuditLogs).where(and(...conds)).orderBy(desc(readAuditLogs.timestamp)).limit(limit);
    }
    return conn.select().from(readAuditLogs).orderBy(desc(readAuditLogs.timestamp)).limit(limit);
  }, "listReadAuditLogs");
}

export async function recordLoginLog(data: {
  userId?: number | null;
  email?: string | null;
  success: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string | null;
}) {
  return withDBRetry(async () => {
    const conn = await getDb();
    if (!conn) return;
    const { loginLogs } = await import('../drizzle/schema');
    await conn.insert(loginLogs).values({
      userId: data.userId ?? null,
      email: data.email ?? null,
      success: data.success,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      reason: data.reason ?? null,
    });
  }, "recordLoginLog");
}

/**
 * Resolve o employee correspondente a um user (login). Procura primeiro
 * por employees.userId; se não houver vínculo, tenta match por email.
 */
export async function getEmployeeForUser(userId: number, userEmail?: string) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return null;
    const byLink = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
    if (byLink[0]) return byLink[0];
    if (userEmail) {
      const byEmail = await db.select().from(employees).where(eq(employees.email, userEmail)).limit(1);
      if (byEmail[0]) return byEmail[0];
    }
    return null;
  }, "getEmployeeForUser");
}

export async function linkEmployeeToUser(employeeId: number, userId: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    await db.update(employees).set({ userId }).where(eq(employees.id, employeeId));
    return { success: true };
  }, "linkEmployeeToUser");
}

export async function listBirthdaysThisMonth() {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    const month = new Date().getMonth() + 1;
    return db.select({
      id: employees.id,
      fullName: employees.fullName,
      birthDate: employees.birthDate,
      email: employees.email,
      phone: employees.phone,
    })
      .from(employees)
      .where(and(
        sql`MONTH(${employees.birthDate}) = ${month}`,
        eq(employees.status, "Ativo")
      ))
      .orderBy(sql`DAY(${employees.birthDate})`);
  }, "listBirthdaysThisMonth");
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
    .where(and(sql`${vacations.concessionLimit} <= ${todayStr()}` as any, eq(vacations.status, "Pendente")));
}

export async function getUpcomingVacationDeadlines(daysAhead: number = 60) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vacations)
    .where(and(
      sql`${vacations.concessionLimit} >= ${todayStr()}` as any,
      sql`${vacations.concessionLimit} <= ${futureDateStr(daysAhead)}` as any,
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
      .where(and(sql`${medicalExams.expiryDate} <= ${todayStr()}` as any, eq(medicalExams.status, "Válido")));
  }, "getExpiredExams");
}

export async function getUpcomingExamExpirations(daysAhead: number = 30) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(medicalExams)
      .where(and(
        sql`${medicalExams.expiryDate} >= ${todayStr()}` as any,
        sql`${medicalExams.expiryDate} <= ${futureDateStr(daysAhead)}` as any,
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
    if (category) conditions.push(eq(documents.category, category as any));
    if (conditions.length > 0) return db.select().from(documents).where((conditions.length === 1 ? conditions[0] : and(...conditions))! as any).orderBy(desc(documents.uploadedAt));
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
    if (checklistType) conditions.push(eq(checklistItems.checklistType, checklistType as any));
    return db.select().from(checklistItems).where((conditions.length === 1 ? conditions[0] : and(...conditions))! as any).orderBy(asc(checklistItems.category), asc(checklistItems.id));
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
  if (isFeatureEnabled("admission-v2")) {
    return [];
  }
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
export async function listNotifications(opts?: { unreadOnly?: boolean; userId?: number; includeGlobal?: boolean }) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];

    const conditions: any[] = [];
    if (opts?.unreadOnly) conditions.push(eq(notifications.isRead, false));
    if (typeof opts?.userId === "number") {
      const scope = opts.includeGlobal === false
        ? eq(notifications.userId, opts.userId)
        : or(eq(notifications.userId, opts.userId), sql`${notifications.userId} IS NULL`);
      conditions.push(scope);
    }

    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    let query = db.select().from(notifications).orderBy(desc(notifications.createdAt)).$dynamic();
    if (where) query = query.where(where);
    return query.limit(100);
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

export async function countUnreadNotifications(opts?: { userId?: number; includeGlobal?: boolean }) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return 0;
    const conditions: any[] = [eq(notifications.isRead, false)];
    if (typeof opts?.userId === "number") {
      const scope = opts.includeGlobal === false
        ? eq(notifications.userId, opts.userId)
        : or(eq(notifications.userId, opts.userId), sql`${notifications.userId} IS NULL`);
      conditions.push(scope);
    }
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const result = await db.select({ count: count() }).from(notifications).where(where);
    return result[0]?.count ?? 0;
  }, "countUnreadNotifications");
}

export async function markUserNotificationRead(id: number, userId: number) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, id),
            or(eq(notifications.userId, userId), sql`${notifications.userId} IS NULL`)
          )
        );
    }, "markUserNotificationRead");
  }, { name: "markUserNotificationRead-transaction" });
}

export async function markAllUserNotificationsRead(userId: number) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.isRead, false),
            or(eq(notifications.userId, userId), sql`${notifications.userId} IS NULL`)
          )
        );
    }, "markAllUserNotificationsRead");
  }, { name: "markAllUserNotificationsRead-transaction" });
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
    const auditData: any = {
      ...data,
    };
    if (data.cpf) {
      auditData.cpf = encryptCPF(data.cpf);
    }
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
export async function getNextNsr(): Promise<number> {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return 1;
    const r = await db.select({ max: sql<number>`COALESCE(MAX(${timeRecords.nsr}), 0)` }).from(timeRecords);
    return Number(r[0]?.max ?? 0) + 1;
  }, "getNextNsr");
}

export async function getLastRecordHash(): Promise<string | null> {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return null;
    const r = await db
      .select({ hash: timeRecords.recordHash })
      .from(timeRecords)
      .where(sql`${timeRecords.recordHash} IS NOT NULL`)
      .orderBy(desc(timeRecords.nsr))
      .limit(1);
    return r[0]?.hash ?? null;
  }, "getLastRecordHash");
}

export async function createTimeRecord(data: {
  employeeId: number;
  clockIn: Date;
  clockOut?: Date;
  location?: string;
  notes?: string;
  selfieUrl?: string;
  geofenceStatus?: "within" | "outside" | "no_geo";
  deviceFingerprint?: string;
}) {
  return withTransaction(async () => {
    return withDBRetry(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const { computeRecordHash } = await import("./utils/portaria-671");
      const employee = await db.select({ cpf: employees.cpf }).from(employees).where(eq(employees.id, data.employeeId)).limit(1);
      const cpf = employee[0]?.cpf ?? "00000000000";
      const nsr = await getNextNsr();
      const previousHash = await getLastRecordHash();
      const recordHash = computeRecordHash({
        previousHash,
        nsr,
        employeeCpf: cpf,
        clockTimestampISO: data.clockIn.toISOString(),
        type: "IN",
      });

      const result = await db.insert(timeRecords).values({
        employeeId: data.employeeId,
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        location: data.location,
        notes: data.notes,
        status: data.geofenceStatus === "outside" ? "PENDING" : "PENDING",
        nsr,
        previousHash,
        recordHash,
        selfieUrl: data.selfieUrl,
        geofenceStatus: data.geofenceStatus ?? "no_geo",
        deviceFingerprint: data.deviceFingerprint,
      } as any);

      return { success: true, id: result[0]?.insertId, nsr };
    }, "createTimeRecord");
  }, { name: "createTimeRecord-transaction" });
}

export async function listTimeRecords(
  employeeId: number,
  startDate?: Date,
  endDate?: Date
) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];

    const conditions = [eq(timeRecords.employeeId, employeeId)];

    if (startDate && endDate) {
      conditions.push(
        and(
          sql`${timeRecords.clockIn} >= ${startDate}` as any,
          sql`${timeRecords.clockIn} <= ${endDate}` as any
        ) as any
      );
    }

    return db.select().from(timeRecords).where(and(...conditions.filter(Boolean))).orderBy(desc(timeRecords.clockIn));
  }, "listTimeRecords");
}

export async function getTimeRecord(id: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(timeRecords).where(eq(timeRecords.id, id));
    return result[0] || null;
  }, "getTimeRecord");
}

export async function getOpenTimeRecord(employeeId: number) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(timeRecords)
      .where(
        and(
          eq(timeRecords.employeeId, employeeId),
          sql`${timeRecords.clockOut} IS NULL`
        )
      )
      .orderBy(desc(timeRecords.clockIn))
      .limit(1);
    return result[0] || null;
  }, "getOpenTimeRecord");
}

export async function updateTimeRecord(id: number, data: Record<string, any>) {
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
  employeeId: number,
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
  employeeId: number;
  timeRecordId: number;
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
      const multiplier = multipliers[data.type] ?? 1;

      const result = await db.insert(overtimeRecords).values({
        employeeId: data.employeeId,
        timeRecordId: data.timeRecordId,
        hoursWorked: String(data.overtimeHours),
        overtimeHours: String(data.overtimeHours),
        multiplier: String(multiplier),
        type: data.type,
        reason: data.reason,
        status: "PENDING",
      } as any);

      return { success: true, id: result[0]?.insertId };
    }, "createOvertimeRequest");
  }, { name: "createOvertimeRequest-transaction" });
}

export async function listOvertimeRequests(
  employeeId?: number,
  status?: "PENDING" | "APPROVED" | "REJECTED"
) {
  return withDBRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    
    const conditions: any[] = [];
    
    if (employeeId) {
      conditions.push(eq(overtimeRecords.employeeId, employeeId));
    }
    
    if (status) {
      conditions.push(eq(overtimeRecords.status, status));
    }
    
    let query: any = db.select().from(overtimeRecords);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return query.orderBy(desc(overtimeRecords.createdAt));
  }, "listOvertimeRequests");
}

export async function updateOvertimeRequest(id: number, data: Record<string, any>) {
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
  employeeId?: number,
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
    
    let baseQuery: any = db.select({
      status: overtimeRecords.status,
      count: count(),
      totalHours: sum(overtimeRecords.overtimeHours),
      totalValue: sum(sql`${overtimeRecords.overtimeHours} * ${overtimeRecords.multiplier}` as any),
    }).from(overtimeRecords);
    
    if (employeeId) {
      baseQuery = baseQuery.where(eq(overtimeRecords.employeeId, employeeId));
    }
    
    const query: any = baseQuery.groupBy(overtimeRecords.status);
    
    const results = await query;
    
    let totalRequests = 0;
    let approvedRequests = 0;
    let rejectedRequests = 0;
    let pendingRequests = 0;
    let totalOvertimeHours = 0;
    let totalOvertimeValue = 0;
    
    results.forEach((row: any) => {
      totalRequests += row.count || 0;
      if (row.status === "APPROVED") approvedRequests += row.count || 0;
      if (row.status === "REJECTED") rejectedRequests += row.count || 0;
      if (row.status === "PENDING") pendingRequests += row.count || 0;
      totalOvertimeHours += (row.totalHours as unknown as number) || 0;
      totalOvertimeValue += (row.totalValue as unknown as number) || 0;
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


// ============================================================
// USERS (AUTENTICAÇÃO JWT)
// ============================================================
export async function getUser(email: string) {
  return withDBRetry(async () => {
    if (isLocalDevUsersEnabled()) {
      return localDevUsers.getUser(email);
    }
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }, "getUser");
}

export async function getUserById(id: number) {
  return withDBRetry(async () => {
    if (isLocalDevUsersEnabled()) {
      return localDevUsers.getUserById(id);
    }
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }, "getUserById");
}

export async function createUser(data: {
  email: string;
  name?: string;
  passwordHash?: string;
  role?: string;
  loginMethod?: string;
}) {
  return withDBRetry(async () => {
    if (isLocalDevUsersEnabled()) {
      return localDevUsers.createUser(data);
    }
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    
    await db.insert(users).values({
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      role: (data.role as any) || 'colaborador',
      loginMethod: data.loginMethod || 'jwt',
    });
    
    const newUser = await db.select().from(users).where(eq(users.email, data.email));
    return newUser[0] || null;
  }, "createUser");
}

export async function updateUser(id: number, data: Partial<{
  email: string;
  name: string | null;
  passwordHash: string | null;
  role: string;
}>) {
  return withDBRetry(async () => {
    if (isLocalDevUsersEnabled()) {
      return localDevUsers.updateUser(id, data as any);
    }
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    
    return db.update(users).set(data as any).where(eq(users.id, id));
  }, "updateUser");
}

export async function deleteUser(id: number) {
  return withDBRetry(async () => {
    if (isLocalDevUsersEnabled()) {
      return localDevUsers.deleteUser(id);
    }
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    
    return db.delete(users).where(eq(users.id, id));
  }, "deleteUser");
}

export async function listUsers() {
  return withDBRetry(async () => {
    if (isLocalDevUsersEnabled()) {
      return localDevUsers.listUsers();
    }
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    return db.select().from(users);
  }, "listUsers");
}

export async function getUsersByRole(role: string) {
  return withDBRetry(async () => {
    if (isLocalDevUsersEnabled()) {
      return localDevUsers.getUsersByRole(role);
    }
    const db = await getDb();
    if (!db) return [];
    return db.select().from(users).where(eq(users.role, role as any));
  }, "getUsersByRole");
}

export async function getUsersByDepartment(_departmentId: string) {
  if (isLocalDevUsersEnabled()) {
    return localDevUsers.getUsersByDepartment(_departmentId);
  }
  // Schema currently lacks departments table — return empty until added
  return [] as Array<typeof users.$inferSelect>;
}
