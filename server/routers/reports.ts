import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import {
  timeRecords,
  vacationPeriods,
  absences,
  employees
} from '../../drizzle/schema';
import { eq, and, gte, lte, count } from 'drizzle-orm';

export const reportsRouter = router({
  timesheetReport: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
      departmentId: z.number().optional(),
      employeeId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'gestor') {
        throw new Error('Permissao negada');
      }
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-01`);
      const endDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-31`);

      const conditions: any[] = [
        gte(timeRecords.clockIn, startDate),
        lte(timeRecords.clockIn, endDate),
      ];

      if (input.employeeId) {
        conditions.push(eq(timeRecords.employeeId, input.employeeId as any));
      }

      return db.select().from(timeRecords).where(and(...conditions as any));
    }),

  vacationReport: protectedProcedure
    .input(z.object({
      year: z.number(),
      departmentId: z.number().optional(),
      status: z.enum(['Planejada', 'Em Andamento', 'Concluida']).optional().or(z.literal('Concluída')),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'gestor') {
        throw new Error('Permissao negada');
      }
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date(`${input.year}-01-01`);
      const endDate = new Date(`${input.year}-12-31`);

      const conditions = [
        gte(vacationPeriods.startDate, startDate),
        lte(vacationPeriods.endDate, endDate),
      ];

      return db.select().from(vacationPeriods).where(and(...conditions));
    }),

  absenceReport: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
      departmentId: z.number().optional(),
      justified: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'gestor') {
        throw new Error('Permissao negada');
      }
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-01`);
      const endDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-31`);

      const conditions = [
        gte(absences.absenceDate, startDate),
        lte(absences.absenceDate, endDate),
      ];

      if (input.justified !== undefined) {
        conditions.push(eq(absences.justified, input.justified));
      }

      return db.select().from(absences).where(and(...conditions));
    }),

  employeeStats: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'gestor') {
        throw new Error('Permissao negada');
      }
      const db = await getDb();
      if (!db) return {};

      const startDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-01`);
      const endDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-31`);

      const [employeeCount, activeCount, absenceCount, vacationCount] = await Promise.all([
        db.select({ count: count() }).from(employees),
        db.select({ count: count() }).from(employees).where(eq(employees.status, 'Ativo')),
        db.select({ count: count() }).from(absences).where(
          and(gte(absences.absenceDate, startDate), lte(absences.absenceDate, endDate))
        ),
        db.select({ count: count() }).from(vacationPeriods).where(
          and(gte(vacationPeriods.startDate, startDate), lte(vacationPeriods.endDate, endDate))
        ),
      ]);

      return {
        totalEmployees: employeeCount[0]?.count ?? 0,
        activeEmployees: activeCount[0]?.count ?? 0,
        totalAbsences: absenceCount[0]?.count ?? 0,
        totalVacationDays: vacationCount[0]?.count ?? 0,
      };
    }),

  summary: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'gestor') {
        throw new Error('Permissao negada');
      }

      const db = await getDb();
      if (!db) return {};

      const startDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-01`);
      const endDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-31`);

      const [timesheetCount, vacationCount, absenceCount, employeeCount] = await Promise.all([
        db.select({ count: count() }).from(timeRecords).where(
          and(gte(timeRecords.clockIn, startDate), lte(timeRecords.clockIn, endDate))
        ),
        db.select({ count: count() }).from(vacationPeriods).where(
          and(gte(vacationPeriods.startDate, startDate), lte(vacationPeriods.endDate, endDate))
        ),
        db.select({ count: count() }).from(absences).where(
          and(gte(absences.absenceDate, startDate), lte(absences.absenceDate, endDate))
        ),
        db.select({ count: count() }).from(employees),
      ]);

      return {
        timesheetRecords: timesheetCount[0]?.count ?? 0,
        vacationRecords: vacationCount[0]?.count ?? 0,
        absenceRecords: absenceCount[0]?.count ?? 0,
        totalEmployees: employeeCount[0]?.count ?? 0,
      };
    }),
});
