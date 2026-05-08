import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";
import {
  buildAfd,
  buildAfdt,
  buildAcjef,
  sha256OfText,
  type AfdRecord,
  type AfdtRecord,
  type AcjefRow,
} from "../utils/portaria-671";
import { evaluateClockRecord, getActiveScheduleRule } from "../utils/journey-engine";

async function loadHeader(periodStart: Date, periodEnd: Date) {
  const company = (await db.listSettings()) as Array<{ key: string; value: string }>;
  const map = new Map(company.map((s) => [s.key, s.value]));
  return {
    cnpj: map.get("company.cnpj") ?? "00000000000000",
    razaoSocial: map.get("company.name") ?? "Empresa não informada",
    repId: map.get("company.repId") ?? "RH-PRIME-REP-P",
    periodStart,
    periodEnd,
    generatedAt: new Date(),
  };
}

export const complianceRouter = router({
  list: protectedProcedure.query(async () => db.listComplianceExports()),

  generateAfd: adminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);
      const records = (await db.listAllTimeRecords(start, end)) as any[];
      const header = await loadHeader(start, end);
      const afdRecords: AfdRecord[] = records.map((r) => ({
        nsr: r.nsr ?? 0,
        cpf: r.cpf ?? "",
        clockIn: new Date(r.clockIn),
        clockOut: r.clockOut ? new Date(r.clockOut) : null,
        recordHash: r.recordHash ?? null,
      }));
      const text = buildAfd(header, afdRecords);
      const sha = sha256OfText(text);
      const bytes = Buffer.byteLength(text, "utf8");
      await db.recordComplianceExport({
        type: "AFD",
        periodStart: start as any,
        periodEnd: end as any,
        generatedById: ctx.user.id,
        recordCount: afdRecords.length,
        fileSha256: sha,
        fileBytes: bytes,
        notes: `${afdRecords.length} marcações`,
      } as any);
      return { content: text, sha256: sha, bytes, records: afdRecords.length };
    }),

  generateAfdt: adminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);
      const records = (await db.listAllTimeRecords(start, end)) as any[];
      const header = await loadHeader(start, end);
      const afdtRecords: AfdtRecord[] = records.map((r) => ({
        nsr: r.nsr ?? 0,
        cpf: r.cpf ?? "",
        clockIn: new Date(r.clockIn),
        clockOut: r.clockOut ? new Date(r.clockOut) : null,
        recordHash: r.recordHash ?? null,
        status: r.status as any,
        wasAdjusted: false,
        hoursWorked: parseFloat(r.hoursWorked ?? "0") || 0,
      }));
      const text = buildAfdt(header, afdtRecords);
      const sha = sha256OfText(text);
      const bytes = Buffer.byteLength(text, "utf8");
      const approvedCount = afdtRecords.filter((r) => r.status === "APPROVED").length;
      await db.recordComplianceExport({
        type: "AFDT",
        periodStart: start as any,
        periodEnd: end as any,
        generatedById: ctx.user.id,
        recordCount: approvedCount,
        fileSha256: sha,
        fileBytes: bytes,
        notes: `${approvedCount} marcações aprovadas`,
      } as any);
      return { content: text, sha256: sha, bytes, records: approvedCount };
    }),

  generateAcjef: adminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);
      const records = (await db.listAllTimeRecords(start, end)) as any[];
      const header = await loadHeader(start, end);

      const ruleCache = new Map<number, Awaited<ReturnType<typeof getActiveScheduleRule>>>();
      const rows: AcjefRow[] = [];
      for (const r of records) {
        if (!r.clockOut || r.status !== "APPROVED") continue;
        let rule = ruleCache.get(r.employeeId);
        if (rule === undefined) {
          rule = await getActiveScheduleRule(r.employeeId);
          ruleCache.set(r.employeeId, rule);
        }
        if (!rule) continue;
        const ev = await evaluateClockRecord({
          clockIn: new Date(r.clockIn),
          clockOut: new Date(r.clockOut),
          rule,
        });
        rows.push({
          cpf: r.cpf ?? "",
          fullName: r.fullName ?? "",
          date: new Date(r.clockIn).toISOString().slice(0, 10),
          expectedMinutes: ev.expectedMinutes,
          workedMinutes: ev.workedMinutes,
          delayMinutes: ev.delayMinutes,
          overtimeMinutes: ev.overtime.total,
          nightMinutes: ev.overtime.typeNight,
          hourBankMinutes: ev.hourBank.credit - ev.hourBank.debit,
        });
      }

      const text = buildAcjef(header, rows);
      const sha = sha256OfText(text);
      const bytes = Buffer.byteLength(text, "utf8");
      await db.recordComplianceExport({
        type: "ACJEF",
        periodStart: start as any,
        periodEnd: end as any,
        generatedById: ctx.user.id,
        recordCount: rows.length,
        fileSha256: sha,
        fileBytes: bytes,
        notes: `${rows.length} dias`,
      } as any);
      return { content: text, sha256: sha, bytes, records: rows.length };
    }),

  verifyChain: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }).optional())
    .query(async ({ input }) => {
      const start = input?.startDate ? new Date(input.startDate) : new Date(0);
      const end = input?.endDate ? new Date(input.endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      const records = (await db.listAllTimeRecords(start, end)) as any[];
      const { computeRecordHash } = await import("../utils/portaria-671");

      let valid = 0;
      let broken = 0;
      const issues: Array<{ id: number; nsr: number; reason: string }> = [];
      for (const r of records) {
        if (!r.recordHash) {
          issues.push({ id: r.id, nsr: r.nsr ?? 0, reason: "Sem hash" });
          broken++;
          continue;
        }
        const recomputed = computeRecordHash({
          previousHash: r.previousHash,
          nsr: r.nsr ?? 0,
          employeeCpf: r.cpf ?? "",
          clockTimestampISO: new Date(r.clockIn).toISOString(),
          type: "IN",
        });
        if (recomputed === r.recordHash) {
          valid++;
        } else {
          broken++;
          issues.push({ id: r.id, nsr: r.nsr ?? 0, reason: "Hash divergente" });
        }
      }
      return { total: records.length, valid, broken, issues: issues.slice(0, 20) };
    }),
});
