import { protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";

export const auditRouter = {
  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      resource: z.string().optional(),
      action: z.string().optional(),
      cpf: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const conditions = [];
      
      if (input.resource) {
        conditions.push(eq(auditLogs.resource, input.resource));
      }
      if (input.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }
      if (input.cpf) {
        conditions.push(eq(auditLogs.cpf, input.cpf));
      }
      if (input.startDate) {
        conditions.push(gte(auditLogs.timestamp, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(auditLogs.timestamp, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.timestamp))
        .limit(input.limit)
        .offset(input.offset);

      return {
        logs: logs.map(log => ({
          ...log,
          changesBefore: log.changesBefore ? JSON.parse(log.changesBefore as string) : null,
          changesAfter: log.changesAfter ? JSON.parse(log.changesAfter as string) : null,
        })),
        total: logs.length,
      };
    }),

  getByResource: protectedProcedure
    .input(z.object({
      resource: z.string(),
      resourceId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.resource, input.resource),
            eq(auditLogs.resourceId, input.resourceId)
          )
        )
        .orderBy(desc(auditLogs.timestamp));

      return logs.map(log => ({
        ...log,
        changesBefore: log.changesBefore ? JSON.parse(log.changesBefore as string) : null,
        changesAfter: log.changesAfter ? JSON.parse(log.changesAfter as string) : null,
      }));
    }),

  getByUser: protectedProcedure
    .input(z.object({
      cpf: z.string(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.cpf, input.cpf))
        .orderBy(desc(auditLogs.timestamp))
        .limit(input.limit);

      return logs.map(log => ({
        ...log,
        changesBefore: log.changesBefore ? JSON.parse(log.changesBefore as string) : null,
        changesAfter: log.changesAfter ? JSON.parse(log.changesAfter as string) : null,
      }));
    }),

  summary: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { byAction: {}, byResource: {}, total: 0 };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const logs = await db
        .select()
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, startDate));

      const byAction: Record<string, number> = {};
      const byResource: Record<string, number> = {};
      let total = 0;

      logs.forEach(log => {
        total++;
        byAction[log.action] = (byAction[log.action] || 0) + 1;
        byResource[log.resource] = (byResource[log.resource] || 0) + 1;
      });

      return { byAction, byResource, total };
    }),
};
