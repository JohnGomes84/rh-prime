import { getDb } from "./db";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import {
  pgr,
  pcmso,
  medicalExams,
  trainings,
  employees,
} from "../drizzle/schema";

export interface ComplianceReport {
  generatedAt: Date;
  companyName: string;
  totalEmployees: number;
  pgrStatus: {
    valid: number;
    expired: number;
    expiringIn30Days: number;
    documents: Array<{
      id: number;
      companyName: string;
      expiryDate: string;
      status: string;
      daysUntilExpiry: number;
    }>;
  };
  pcmsoStatus: {
    valid: number;
    expired: number;
    expiringIn30Days: number;
    documents: Array<{
      id: number;
      companyName: string;
      expiryDate: string;
      status: string;
      daysUntilExpiry: number;
    }>;
  };
  asoStatus: {
    valid: number;
    expired: number;
    expiringEmployees: Array<{
      employeeId: number;
      employeeName: string;
      examType: string;
      expiryDate: string;
      daysUntilExpiry: number;
    }>;
  };
  trainingStatus: {
    valid: number;
    expired: number;
    expiringEmployees: Array<{
      employeeId: number;
      employeeName: string;
      trainingName: string;
      expiryDate: string;
      daysUntilExpiry: number;
    }>;
  };
  summary: {
    criticalIssues: number;
    warningIssues: number;
    allCompliant: boolean;
  };
}

function calculateDaysUntilExpiry(expiryDate: Date | string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const timeDiff = expiry.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

export async function generateComplianceReport(
  companyName: string
): Promise<ComplianceReport> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split("T")[0];
  const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

  // Fetch PGR documents
  const pgrDocs = await db.select().from(pgr);
  const pgrValid = pgrDocs.filter((p) => p.status === "Válido").length;
  const pgrExpired = pgrDocs.filter((p) => p.status === "Vencido").length;
  const pgrExpiringIn30 = pgrDocs.filter(
    (p) =>
      p.status === "Válido" &&
      new Date(p.expiryDate) <= thirtyDaysFromNow &&
      new Date(p.expiryDate) >= today
  ).length;

  const pgrDocuments = pgrDocs.map((p) => ({
    id: p.id,
    companyName: p.companyName,
    expiryDate: new Date(p.expiryDate).toLocaleDateString("pt-BR"),
    status: p.status,
    daysUntilExpiry: calculateDaysUntilExpiry(p.expiryDate),
  }));

  // Fetch PCMSO documents
  const pcmsoDocs = await db.select().from(pcmso);
  const pcmsoValid = pcmsoDocs.filter((p) => p.status === "Válido").length;
  const pcmsoExpired = pcmsoDocs.filter((p) => p.status === "Vencido").length;
  const pcmsoExpiringIn30 = pcmsoDocs.filter(
    (p) =>
      p.status === "Válido" &&
      new Date(p.expiryDate) <= thirtyDaysFromNow &&
      new Date(p.expiryDate) >= today
  ).length;

  const pcmsoDocuments = pcmsoDocs.map((p) => ({
    id: p.id,
    companyName: p.companyName,
    expiryDate: new Date(p.expiryDate).toLocaleDateString("pt-BR"),
    status: p.status,
    daysUntilExpiry: calculateDaysUntilExpiry(p.expiryDate),
  }));

  // Fetch ASO/Medical Exams
  const asos = await db
    .select({
      id: medicalExams.id,
      employeeId: medicalExams.employeeId,
      employeeName: employees.fullName,
      examType: medicalExams.examType,
      expiryDate: medicalExams.expiryDate,
      status: medicalExams.status,
    })
    .from(medicalExams)
    .leftJoin(employees, eq(medicalExams.employeeId, employees.id));

  const asoValid = asos.filter((a) => a.status === "Válido").length;
  const asoExpired = asos.filter((a) => a.status === "Vencido").length;
  const asoExpiringEmployees = asos
    .filter(
      (a) =>
        a.status === "Válido" &&
        a.expiryDate &&
        new Date(a.expiryDate) <= thirtyDaysFromNow &&
        new Date(a.expiryDate) >= today
    )
    .map((a) => ({
      employeeId: a.employeeId,
      employeeName: a.employeeName || "Desconhecido",
      examType: a.examType,
      expiryDate: a.expiryDate
        ? new Date(a.expiryDate).toLocaleDateString("pt-BR")
        : "N/A",
      daysUntilExpiry: a.expiryDate
        ? calculateDaysUntilExpiry(a.expiryDate)
        : 0,
    }));

  // Fetch Trainings
  const trainingsData = await db
    .select({
      id: trainings.id,
      employeeId: trainings.employeeId,
      employeeName: employees.fullName,
      trainingName: trainings.trainingName,
      expiryDate: trainings.expiryDate,
      status: trainings.status,
    })
    .from(trainings)
    .leftJoin(employees, eq(trainings.employeeId, employees.id));

  const trainingValid = trainingsData.filter(
    (t) => t.status === "Válido"
  ).length;
  const trainingExpired = trainingsData.filter(
    (t) => t.status === "Vencido"
  ).length;
  const trainingExpiringEmployees = trainingsData
    .filter(
      (t) =>
        t.status === "Válido" &&
        t.expiryDate &&
        new Date(t.expiryDate) <= thirtyDaysFromNow &&
        new Date(t.expiryDate) >= today
    )
    .map((t) => ({
      employeeId: t.employeeId,
      employeeName: t.employeeName || "Desconhecido",
      trainingName: t.trainingName,
      expiryDate: t.expiryDate
        ? new Date(t.expiryDate).toLocaleDateString("pt-BR")
        : "N/A",
      daysUntilExpiry: t.expiryDate
        ? calculateDaysUntilExpiry(t.expiryDate)
        : 0,
    }));

  // Get total employees
  const totalEmployeesResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(employees);
  const totalEmployees = totalEmployeesResult[0]?.count ?? 0;

  // Calculate summary
  const criticalIssues =
    pgrExpired + pcmsoExpired + asoExpired + trainingExpired;
  const warningIssues =
    pgrExpiringIn30 + pcmsoExpiringIn30 + asoExpiringEmployees.length + trainingExpiringEmployees.length;
  const allCompliant = criticalIssues === 0 && warningIssues === 0;

  return {
    generatedAt: today,
    companyName,
    totalEmployees,
    pgrStatus: {
      valid: pgrValid,
      expired: pgrExpired,
      expiringIn30Days: pgrExpiringIn30,
      documents: pgrDocuments,
    },
    pcmsoStatus: {
      valid: pcmsoValid,
      expired: pcmsoExpired,
      expiringIn30Days: pcmsoExpiringIn30,
      documents: pcmsoDocuments,
    },
    asoStatus: {
      valid: asoValid,
      expired: asoExpired,
      expiringEmployees: asoExpiringEmployees,
    },
    trainingStatus: {
      valid: trainingValid,
      expired: trainingExpired,
      expiringEmployees: trainingExpiringEmployees,
    },
    summary: {
      criticalIssues,
      warningIssues,
      allCompliant,
    },
  };
}
