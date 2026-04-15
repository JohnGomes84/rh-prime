import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql, and, gte, lt, eq } from "drizzle-orm";
import { accountsReceivable, accountsPayable } from "../../drizzle/schema";
import { cacheGet, cacheSet, getDashboardCacheKey } from "../cache";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const emptyRevenueDetails = { byStatus: [], byClient: [] };
const emptyCostsDetails = { byStatus: [] };
const emptyCashFlowForecast = {
  historical: [],
  forecast: [],
  summary: {
    avgRevenue: 0,
    avgCosts: 0,
    avgMargin: 0,
    confidence: 0,
  },
};

/**
 * Drill-down nos KPIs com filtros contextuais
 */
export const dashboardAdvancedRouter = router({
  /**
   * Obter detalhes de faturamento para drill-down
   */
  getRevenueDetails: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const cacheKey = getDashboardCacheKey(input.year, input.month, 'revenue-details');
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const db = await getDb();
      if (!db) return emptyRevenueDetails;

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      // Receitas por status
      const byStatus = await db
        .select({
          status: accountsReceivable.status,
          total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(accountsReceivable)
        .where(and(gte(accountsReceivable.dueDate, startDate), lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000))))
        .groupBy(accountsReceivable.status);

      // Receitas por cliente (top 10)
      const byClient = await db
        .select({
          clientId: accountsReceivable.clientId,
          total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(accountsReceivable)
        .where(and(gte(accountsReceivable.dueDate, startDate), lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000))))
        .groupBy(accountsReceivable.clientId)
        .orderBy(sql`SUM(${accountsReceivable.amount}) DESC`)
        .limit(10);

      const result = {
        byStatus: byStatus.map((item) => ({
          ...item,
          total: toNumber(item.total),
          count: toNumber(item.count),
        })),
        byClient: byClient.map((item) => ({
          ...item,
          total: toNumber(item.total),
          count: toNumber(item.count),
        })),
      };
      await cacheSet(cacheKey, result, 600);
      return result;
    }),

  /**
   * Obter detalhes de custos para drill-down
   */
  getCostsDetails: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const cacheKey = getDashboardCacheKey(input.year, input.month, 'costs-details');
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const db = await getDb();
      if (!db) return emptyCostsDetails;

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      // Custos por status
      const byStatus = await db
        .select({
          status: accountsPayable.status,
          total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(accountsPayable)
        .where(and(gte(accountsPayable.dueDate, startDate), lt(accountsPayable.dueDate, new Date(endDate.getTime() + 86400000))))
        .groupBy(accountsPayable.status);

      const result = {
        byStatus: byStatus.map((item) => ({
          ...item,
          total: toNumber(item.total),
          count: toNumber(item.count),
        })),
      };
      await cacheSet(cacheKey, result, 600);
      return result;
    }),

  /**
   * Previsão de fluxo de caixa (próximos 30 dias)
   * Usa média dos últimos 3 meses para prever
   */
  getCashFlowForecast: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const cacheKey = getDashboardCacheKey(input.year, input.month, 'cashflow-forecast');
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;

      const db = await getDb();
      if (!db) return emptyCashFlowForecast;

      // Coletar dados dos últimos 3 meses
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(input.year, input.month - 1 - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }

      const historicalData: { month: string; revenue: number; costs: number }[] = [];

      for (const m of months) {
        const startDate = new Date(m.year, m.month - 1, 1);
        const endDate = new Date(m.year, m.month, 0);

        const revResult = await db
          .select({ total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)` })
          .from(accountsReceivable)
          .where(and(gte(accountsReceivable.dueDate, startDate), lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000))));

        const costResult = await db
          .select({ total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)` })
          .from(accountsPayable)
          .where(and(gte(accountsPayable.dueDate, startDate), lt(accountsPayable.dueDate, new Date(endDate.getTime() + 86400000))));

        historicalData.push({
          month: `${m.month}/${m.year}`,
          revenue: toNumber(revResult[0]?.total),
          costs: toNumber(costResult[0]?.total),
        });
      }

      // Calcular médias
      const avgRevenue = historicalData.reduce((sum, d) => sum + d.revenue, 0) / Math.max(1, historicalData.length);
      const avgCosts = historicalData.reduce((sum, d) => sum + d.costs, 0) / Math.max(1, historicalData.length);
      const avgMargin = avgRevenue - avgCosts;

      // Gerar previsão para próximos 30 dias (dividido em 4 semanas)
      const forecast = [
        { week: 'Semana 1', revenue: avgRevenue * 0.25, costs: avgCosts * 0.25, margin: (avgRevenue - avgCosts) * 0.25 },
        { week: 'Semana 2', revenue: avgRevenue * 0.25, costs: avgCosts * 0.25, margin: (avgRevenue - avgCosts) * 0.25 },
        { week: 'Semana 3', revenue: avgRevenue * 0.25, costs: avgCosts * 0.25, margin: (avgRevenue - avgCosts) * 0.25 },
        { week: 'Semana 4', revenue: avgRevenue * 0.25, costs: avgCosts * 0.25, margin: (avgRevenue - avgCosts) * 0.25 },
      ];

      const result = {
        historical: historicalData,
        forecast,
        summary: {
          avgRevenue: Math.round(avgRevenue),
          avgCosts: Math.round(avgCosts),
          avgMargin: Math.round(avgMargin),
          confidence: 0.75, // 75% confiança baseado em 3 meses
        },
      };

      await cacheSet(cacheKey, result, 600);
      return result;
    }),
});
