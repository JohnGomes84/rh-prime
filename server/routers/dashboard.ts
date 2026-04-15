import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql, and, gte, lt, eq } from "drizzle-orm";
import { accountsReceivable, accountsPayable, workSchedules, clients, employees } from "../../drizzle/schema";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const emptyKpis = {
  revenue: { current: 0, previous: 0, variation: 0 },
  costs: { current: 0, previous: 0, variation: 0 },
  margin: { current: 0, previous: 0, variation: 0, isNegative: false },
  works: { current: 0, previous: 0, variation: 0 },
};

const emptyAlerts = {
  loss: { exists: false, amount: 0, month: "" },
  overdueAccounts: { count: 0, total: 0 },
  employeesWithoutPix: { count: 0 },
  pendingSchedules: { count: 0 },
};

const emptyAccountsSummary = {
  payablePending: 0,
  payablePaid: 0,
  receivablePending: 0,
  receivablePaid: 0,
  forecastedBalance: 0,
};

export const dashboardRouter = router({
  /**
   * Busca KPIs principais do mês (faturamento, custos, margem, trabalhos)
   */
  getMonthlyKPIs: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(2100),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return emptyKpis;

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);
      const prevStartDate = new Date(input.year, input.month - 2, 1);
      const prevEndDate = new Date(input.year, input.month - 1, 0);

      // Faturamento do mês (contas a receber)
      const currentRevenueResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
        })
        .from(accountsReceivable)
        .where(
          and(
            gte(accountsReceivable.dueDate, startDate),
            lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000)),
            eq(accountsReceivable.status, 'pendente')
          )
        );

      const prevRevenueResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
        })
        .from(accountsReceivable)
        .where(
          and(
            gte(accountsReceivable.dueDate, prevStartDate),
            lt(accountsReceivable.dueDate, new Date(prevEndDate.getTime() + 86400000)),
            eq(accountsReceivable.status, 'pendente')
          )
        );

      const currentRevenue = toNumber(currentRevenueResult[0]?.total);
      const prevRevenue = toNumber(prevRevenueResult[0]?.total);
      const revenueVariation = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Custos operacionais (contas a pagar)
      const currentCostsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
        })
        .from(accountsPayable)
        .where(
          and(
            gte(accountsPayable.dueDate, startDate),
            lt(accountsPayable.dueDate, new Date(endDate.getTime() + 86400000)),
            eq(accountsPayable.status, 'pendente')
          )
        );

      const prevCostsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
        })
        .from(accountsPayable)
        .where(
          and(
            gte(accountsPayable.dueDate, prevStartDate),
            lt(accountsPayable.dueDate, new Date(prevEndDate.getTime() + 86400000)),
            eq(accountsPayable.status, 'pendente')
          )
        );

      const currentCosts = toNumber(currentCostsResult[0]?.total);
      const prevCosts = toNumber(prevCostsResult[0]?.total);
      const costsVariation = prevCosts > 0 ? ((currentCosts - prevCosts) / prevCosts) * 100 : 0;

      // Margem de lucro
      const currentMargin = currentRevenue - currentCosts;
      const prevMargin = prevRevenue - prevCosts;
      const marginVariation = prevMargin !== 0 ? ((currentMargin - prevMargin) / Math.abs(prevMargin)) * 100 : 0;

      // Total de trabalhos (planejamentos validados)
      const currentWorksResult = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${workSchedules.id})`,
        })
        .from(workSchedules)
        .where(
          and(
            gte(workSchedules.date, startDate),
            lt(workSchedules.date, new Date(endDate.getTime() + 86400000))
          )
        );

      const prevWorksResult = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${workSchedules.id})`,
        })
        .from(workSchedules)
        .where(
          and(
            gte(workSchedules.date, prevStartDate),
            lt(workSchedules.date, new Date(prevEndDate.getTime() + 86400000))
          )
        );

      const currentWorks = toNumber(currentWorksResult[0]?.count);
      const prevWorks = toNumber(prevWorksResult[0]?.count);
      const worksVariation = prevWorks > 0 ? ((currentWorks - prevWorks) / prevWorks) * 100 : 0;

      return {
        revenue: {
          current: currentRevenue,
          previous: prevRevenue,
          variation: revenueVariation,
        },
        costs: {
          current: currentCosts,
          previous: prevCosts,
          variation: costsVariation,
        },
        margin: {
          current: currentMargin,
          previous: prevMargin,
          variation: marginVariation,
          isNegative: currentMargin < 0,
        },
        works: {
          current: currentWorks,
          previous: prevWorks,
          variation: worksVariation,
        },
      };
    }),

  /**
   * Busca alertas automáticos estruturados
   */
  getAlerts: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(2100),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          ...emptyAlerts,
          loss: {
            ...emptyAlerts.loss,
            month: new Date(input.year, input.month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
          },
        };
      }

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);
      const today = new Date();

      // Prejuízo
      const revenueResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
        })
        .from(accountsReceivable)
        .where(
          and(
            gte(accountsReceivable.dueDate, startDate),
            lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000))
          )
        );

      const costsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
        })
        .from(accountsPayable)
        .where(
          and(
            gte(accountsPayable.dueDate, startDate),
            lt(accountsPayable.dueDate, new Date(endDate.getTime() + 86400000))
          )
        );

      const revenue = toNumber(revenueResult[0]?.total);
      const costs = toNumber(costsResult[0]?.total);
      const lossAmount = costs - revenue;
      const lossExists = lossAmount > 0;

      // Contas a pagar vencidas
      const overdueResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
          total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
        })
        .from(accountsPayable)
        .where(
          and(
            lt(accountsPayable.dueDate, today),
            eq(accountsPayable.status, 'pendente')
          )
        );

      const overdueCount = toNumber(overdueResult[0]?.count);
      const overdueTotal = toNumber(overdueResult[0]?.total);

      // Diaristas sem PIX
      const employeesWithoutPixResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(employees)
        .where(
          and(
            eq(employees.status, 'diarista'),
            sql`${employees.pixKey} IS NULL OR ${employees.pixKey} = ''`
          )
        );

      const employeesWithoutPixCount = toNumber(employeesWithoutPixResult[0]?.count);

      // Planejamentos pendentes (mais antigos que 2 dias)
      const pendingSchedulesResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(workSchedules)
        .where(
          and(
            lt(workSchedules.date, new Date(today.getTime() - 2 * 86400000)),
            eq(workSchedules.status, 'pendente')
          )
        );

      const pendingSchedulesCount = toNumber(pendingSchedulesResult[0]?.count);

      return {
        loss: {
          exists: lossExists,
          amount: lossAmount,
          month: new Date(input.year, input.month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
        },
        overdueAccounts: {
          count: overdueCount,
          total: overdueTotal,
        },
        employeesWithoutPix: {
          count: employeesWithoutPixCount,
        },
        pendingSchedules: {
          count: pendingSchedulesCount,
        },
      };
    }),

  /**
   * Evolução financeira diária
   */
  getDailyFinancialEvolution: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(2100),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      // Build daily evolution data
      const daysInMonth = endDate.getDate();
      const data = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(input.year, input.month - 1, day);
        const dayEnd = new Date(input.year, input.month - 1, day + 1);

        const revenueResult = await db
          .select({
            total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
          })
          .from(accountsReceivable)
          .where(
            and(
              gte(accountsReceivable.dueDate, dayStart),
              lt(accountsReceivable.dueDate, dayEnd)
            )
          );

        const costsResult = await db
          .select({
            total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
          })
          .from(accountsPayable)
          .where(
            and(
              gte(accountsPayable.dueDate, dayStart),
              lt(accountsPayable.dueDate, dayEnd)
            )
          );

        const dateStr = `${input.year}-${String(input.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const revenue = toNumber(revenueResult[0]?.total);
        const costs = toNumber(costsResult[0]?.total);

        data.push({
          date: dateStr,
          revenue,
          costs,
          margin: revenue - costs,
        });
      }

      return data;
    }),

  /**
   * Top 3 clientes por faturamento
   */
  getTopClients: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(2100),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const results = await db
        .select({
          clientId: accountsReceivable.clientId,
          clientName: clients.name,
          totalRevenue: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
          workCount: sql<number>`COUNT(DISTINCT ${workSchedules.id})`,
        })
        .from(accountsReceivable)
        .leftJoin(
          workSchedules,
          sql`DATE(${accountsReceivable.dueDate}) = DATE(${workSchedules.date})`
        )
        .leftJoin(clients, eq(accountsReceivable.clientId, clients.id))
        .where(
          and(
            gte(accountsReceivable.dueDate, startDate),
            lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000))
          )
        )
        .groupBy(accountsReceivable.clientId)
        .orderBy(sql`SUM(${accountsReceivable.amount}) DESC`)
        .limit(3);

      return results.map((r) => ({
        clientId: r.clientId,
        clientName: r.clientName || 'Desconhecido',
          totalRevenue: toNumber(r.totalRevenue),
          workCount: toNumber(r.workCount),
      }));
    }),

  /**
   * Resumo de contas a pagar e receber
   */
  getAccountsSummary: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(2100),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return emptyAccountsSummary;

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const payablePendingResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
        })
        .from(accountsPayable)
        .where(
          and(
            gte(accountsPayable.dueDate, startDate),
            lt(accountsPayable.dueDate, new Date(endDate.getTime() + 86400000)),
            eq(accountsPayable.status, 'pendente')
          )
        );

      const payablePaidResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsPayable.amount}), 0)`,
        })
        .from(accountsPayable)
        .where(
          and(
            gte(accountsPayable.dueDate, startDate),
            lt(accountsPayable.dueDate, new Date(endDate.getTime() + 86400000)),
            eq(accountsPayable.status, 'pago')
          )
        );

      const receivablePendingResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
        })
        .from(accountsReceivable)
        .where(
          and(
            gte(accountsReceivable.dueDate, startDate),
            lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000)),
            eq(accountsReceivable.status, 'pendente')
          )
        );

      const receivablePaidResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountsReceivable.amount}), 0)`,
        })
        .from(accountsReceivable)
        .where(
          and(
            gte(accountsReceivable.dueDate, startDate),
            lt(accountsReceivable.dueDate, new Date(endDate.getTime() + 86400000)),
            eq(accountsReceivable.status, 'recebido')
          )
        );

      const payablePending = toNumber(payablePendingResult[0]?.total);
      const payablePaid = toNumber(payablePaidResult[0]?.total);
      const receivablePending = toNumber(receivablePendingResult[0]?.total);
      const receivablePaid = toNumber(receivablePaidResult[0]?.total);

      return {
        payablePending,
        payablePaid,
        receivablePending,
        receivablePaid,
        forecastedBalance: receivablePending + receivablePaid - payablePending - payablePaid,
      };
    }),
});
