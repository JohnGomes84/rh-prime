import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { 
  timeRecords, 
  vacationPeriods, 
  absences, 
  employees 
} from '../../drizzle/schema';
import { eq, and, gte, lte, count, sum } from 'drizzle-orm';

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
        throw new Error('Permissão negada');
      }
      const db = await getDb();
      if (!db) return [];
      
      const startDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-01`);
      const endDate = new Date(`${input.year}-${String(input.month).padStart(2, '0')}-31`);
      
      const conditions: any = [
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
      status: z.enum(['Planejada', 'Em Andamento', 'Concluída']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'gestor') {
        throw new Error('Permissão negada');
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
        throw new Error('Permissão negada');
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
        throw new Error('Permissão negada');
      }
      const db = await getDb();
      if (!db) return {};
      
      // Retornar estatísticas simples
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        totalAbsences: 0,
        totalVacationDays: 0,
      };
    }),

  summary: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'gestor') {
        throw new Error('Permissão negada');
      }
      
      // Retornar resumo de relatórios disponíveis
      return {
        timesheetRecords: 0,
        vacationRecords: 0,
        absenceRecords: 0,
        totalEmployees: 0,
      };
    }),
});
