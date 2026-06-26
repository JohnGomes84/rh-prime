import { getDb } from "../../db.js";
import { mrReports, mrReportItems } from "../../../drizzle/schema.js";
import { and, eq, desc } from "drizzle-orm";
import { getTemplate } from "./templates.js";
import type { MrReport, MrReportItem } from "../../../drizzle/schema-managerial-reports.js";

export interface ListFilter {
  sector?: "rh_admin" | "financeiro";
  cadence?: "semanal" | "mensal";
  status?: "rascunho" | "enviado" | "validado" | "devolvido";
  periodRef?: string;
  authorId?: number;
}

export async function listReports(filter: ListFilter = {}): Promise<MrReport[]> {
  const db = await getDb();
  if (!db) return [];
  const conds: any[] = [];
  if (filter.sector) conds.push(eq(mrReports.sector, filter.sector));
  if (filter.cadence) conds.push(eq(mrReports.cadence, filter.cadence));
  if (filter.status) conds.push(eq(mrReports.status, filter.status));
  if (filter.periodRef) conds.push(eq(mrReports.periodRef, filter.periodRef));
  if (filter.authorId) conds.push(eq(mrReports.authorId, filter.authorId));
  const q = db.select().from(mrReports);
  const rows = conds.length ? await q.where(and(...conds)) : await q;
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getReport(
  id: number,
): Promise<{ report: MrReport; items: MrReportItem[] } | null> {
  const db = await getDb();
  if (!db) return null;
  const [report] = await db.select().from(mrReports).where(eq(mrReports.id, id));
  if (!report) return null;
  const items = await db
    .select()
    .from(mrReportItems)
    .where(eq(mrReportItems.reportId, id));
  items.sort((a, b) => a.sortOrder - b.sortOrder);
  return { report, items };
}

export async function findByPeriod(
  sector: string,
  cadence: string,
  periodRef: string,
): Promise<MrReport | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(mrReports)
    .where(
      and(
        eq(mrReports.sector, sector as any),
        eq(mrReports.cadence, cadence as any),
        eq(mrReports.periodRef, periodRef),
      ),
    );
  return row ?? null;
}

export interface CreateFromTemplateArgs {
  templateKey: string;
  periodRef: string;
  dueDate: string;
  authorId: number;
}

export async function createFromTemplate(args: CreateFromTemplateArgs): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  const template = getTemplate(args.templateKey);
  if (!template) throw new Error(`Template inexistente: ${args.templateKey}`);

  const [res] = await db.insert(mrReports).values({
    templateKey: template.key,
    sector: template.sector,
    cadence: template.cadence,
    periodRef: args.periodRef,
    dueDate: args.dueDate,
    authorId: args.authorId,
    status: "rascunho",
  });
  const reportId = Number((res as any).insertId);

  await db.insert(mrReportItems).values(
    template.items.map((item, idx) => ({
      reportId,
      label: item.label,
      expectedContent: item.expectedContent,
      itemStatus: "pendente" as const,
      sortOrder: idx,
    })),
  );
  return reportId;
}

export async function updateReportFields(
  id: number,
  patch: Partial<Pick<MrReport, "summary" | "pointsForValidator" | "nextPriorities">>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mrReports).set(patch).where(eq(mrReports.id, id));
}

export async function updateItemFields(
  itemId: number,
  patch: Partial<Pick<MrReportItem, "value" | "itemStatus">>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mrReportItems).set(patch).where(eq(mrReportItems.id, itemId));
}

export async function setReportStatus(
  id: number,
  patch: Partial<
    Pick<
      MrReport,
      "status" | "wasOnTime" | "submittedAt" | "validatedAt" | "validatedBy" | "rejectionNote" | "lockedSnapshot"
    >
  >,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mrReports).set(patch).where(eq(mrReports.id, id));
}
