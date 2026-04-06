import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql, and, gte, lt, eq } from "drizzle-orm";
import { accountsReceivable, accountsPayable, employees } from "../../drizzle/schema";

/**
 * Score de Saúde Financeira (0-100)
 * Baseado em: margem%, dias de caixa, taxa de inadimplência
 */
export const dashboardEnhancementsRouter = router({
  getHealthScore: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      // 1. Margem (40% do score)
      const revenueResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)` })
        .from(accountsReceivable)
        .where(and(gte(accountsReceivable.dueDate, startDate), lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000))));

      const costsResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)` })
        .from(accountsPayable)
        .where(and(gte(accountsPayable.dueDate, startDate), lt(accountsPayable.dueDate, new Date(endDate.getTime() + 86400000))));

      const revenue = revenueResult[0]?.total || 1;
      const costs = costsResult[0]?.total || 0;
      const margin = ((revenue - costs) / revenue) * 100;
      const marginScore = Math.max(0, Math.min(40, (margin / 50) * 40)); // 50% margin = 40 pontos

      // 2. Inadimplência (30% do score)
      const overdueResult = await db
        .select({
          overdueAmount: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
          totalAmount: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
        })
        .from(accountsPayable)
        .where(and(lt(accountsPayable.dueDate, new Date()), eq(accountsPayable.status, 'pendente')));

      const overdueAmount = overdueResult[0]?.overdueAmount || 0;
      const delinquencyRate = revenue > 0 ? (overdueAmount / revenue) * 100 : 0;
      const delinquencyScore = Math.max(0, 30 - (delinquencyRate * 0.3)); // Cada 1% de atraso = -0.3 pontos

      // 3. Dias de Caixa (30% do score)
      const dailyAvgCosts = costs / Math.max(1, endDate.getDate());
      const daysOfCash = revenue > 0 ? revenue / Math.max(1, dailyAvgCosts) : 0;
      const cashScore = Math.max(0, Math.min(30, (daysOfCash / 30) * 30)); // 30 dias = 30 pontos

      const totalScore = Math.round(marginScore + delinquencyScore + cashScore);
      const status = totalScore >= 75 ? 'excellent' : totalScore >= 50 ? 'good' : totalScore >= 25 ? 'warning' : 'critical';

      return {
        score: totalScore,
        status,
        breakdown: {
          margin: { score: Math.round(marginScore), percentage: Math.round(margin) },
          delinquency: { score: Math.round(delinquencyScore), percentage: Math.round(delinquencyRate) },
          cashDays: { score: Math.round(cashScore), days: Math.round(daysOfCash) },
        },
      };
    }),

  /**
   * Comparação Trimestral e YTD
   */
  getTrimestrialComparison: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const quarters = [
        { name: 'Q1', months: [1, 2, 3] },
        { name: 'Q2', months: [4, 5, 6] },
        { name: 'Q3', months: [7, 8, 9] },
        { name: 'Q4', months: [10, 11, 12] },
      ];

      const results = [];

      for (const q of quarters) {
        const qStart = new Date(input.year, q.months[0] - 1, 1);
        const qEnd = new Date(input.year, q.months[2] + 1, 0);

        const revResult = await db
          .select({ total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)` })
          .from(accountsReceivable)
          .where(and(gte(accountsReceivable.dueDate, qStart), lt(accountsReceivable.dueDate, new Date(qEnd.getTime() + 86400000))));

        const costResult = await db
          .select({ total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)` })
          .from(accountsPayable)
          .where(and(gte(accountsPayable.dueDate, qStart), lt(accountsPayable.dueDate, new Date(qEnd.getTime() + 86400000))));

        const revenue = revResult[0]?.total || 0;
        const costs = costResult[0]?.total || 0;

        results.push({
          quarter: q.name,
          revenue,
          costs,
          margin: revenue - costs,
          marginPercent: revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0,
        });
      }

      // YTD
      const ytdStart = new Date(input.year, 0, 1);
      const ytdEnd = new Date(input.year, 11, 31);

      const ytdRevResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)` })
        .from(accountsReceivable)
        .where(and(gte(accountsReceivable.dueDate, ytdStart), lt(accountsReceivable.dueDate, new Date(ytdEnd.getTime() + 86400000))));

      const ytdCostResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)` })
        .from(accountsPayable)
        .where(and(gte(accountsPayable.dueDate, ytdStart), lt(accountsPayable.dueDate, new Date(ytdEnd.getTime() + 86400000))));

      const ytdRevenue = ytdRevResult[0]?.total || 0;
      const ytdCosts = ytdCostResult[0]?.total || 0;

      return {
        quarters: results,
        ytd: {
          revenue: ytdRevenue,
          costs: ytdCosts,
          margin: ytdRevenue - ytdCosts,
          marginPercent: ytdRevenue > 0 ? ((ytdRevenue - ytdCosts) / ytdRevenue) * 100 : 0,
        },
      };
    }),

  /**
   * Exportar dados para Excel (estrutura)
   */
  getExportData: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number(), format: z.enum(['csv', 'json']) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      // Contas a receber
      const receivables = await db
        .select({
          date: accountsReceivable.dueDate,
          amount: accountsReceivable.amount,
          status: accountsReceivable.status,
          clientId: accountsReceivable.clientId,
        })
        .from(accountsReceivable)
        .where(and(gte(accountsReceivable.dueDate, startDate), lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000))));

      // Contas a pagar
      const payables = await db
        .select({
          date: accountsPayable.dueDate,
          amount: accountsPayable.amount,
          status: accountsPayable.status,
        })
        .from(accountsPayable)
        .where(and(gte(accountsPayable.dueDate, startDate), lt(accountsPayable.dueDate, new Date(endDate.getTime() + 86400000))));

      if (input.format === 'csv') {
        let csv = 'Tipo,Data,Valor,Status\n';
        receivables.forEach((r) => {
          csv += `Receber,${new Date(r.date).toLocaleDateString('pt-BR')},${r.amount},${r.status}\n`;
        });
        payables.forEach((p) => {
          csv += `Pagar,${new Date(p.date).toLocaleDateString('pt-BR')},${p.amount},${p.status}\n`;
        });
        return { data: csv, filename: `export-${input.year}-${String(input.month).padStart(2, '0')}.csv` };
      }

      return {
        data: { receivables, payables },
        filename: `export-${input.year}-${String(input.month).padStart(2, '0')}.json`,
      };
    }),
});
