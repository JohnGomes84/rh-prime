import { router, protectedProcedure } from "../\_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { nfesReceived } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

/**
 * Router para gerenciar notas fiscais recebidas via Focus NFe
 */
export const fiscalRouter = router({
  /**
   * Listar NFes recebidas com filtros
   */
  getNfesRecebidas: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(10),
        status: z.enum(["received", "processed", "reconciled", "rejected"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        emitterCNPJ: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const offset = (input.page - 1) * input.limit;

      // Construir filtros
      const filters = [];
      if (input.status) filters.push(eq(nfesReceived.status, input.status));
      if (input.startDate) filters.push(gte(nfesReceived.issueDate, input.startDate));
      if (input.endDate) filters.push(lte(nfesReceived.issueDate, input.endDate));
      if (input.emitterCNPJ) filters.push(eq(nfesReceived.emitterCNPJ, input.emitterCNPJ));

      // Consultar NFes
      const result = await db
        .select()
        .from(nfesReceived)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(nfesReceived.createdAt))
        .limit(input.limit)
        .offset(offset);

      // Contar total
      const countResult = await db
        .select({ count: nfesReceived.id })
        .from(nfesReceived)
        .where(filters.length > 0 ? and(...filters) : undefined);

      return {
        data: result,
        total: countResult.length > 0 ? countResult[0].count : 0,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Obter detalhes de uma NFe específica
   */
  getNfeDetalhes: protectedProcedure
    .input(z.object({ nfeNumber: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(nfesReceived)
        .where(eq(nfesReceived.nfeNumber, input.nfeNumber))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * Vincular NFe a uma conta a receber
   */
  linkNfeToAccount: protectedProcedure
    .input(
      z.object({
        nfeNumber: z.string(),
        accountId: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(nfesReceived)
        .set({
          linkedAccountId: input.accountId,
          status: "processed",
          updatedAt: new Date(),
        })
        .where(eq(nfesReceived.nfeNumber, input.nfeNumber));

      return { success: true };
    }),

  /**
   * Marcar NFe como reconciliada
   */
  markAsReconciled: protectedProcedure
    .input(z.object({ nfeNumber: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(nfesReceived)
        .set({
          status: "reconciled",
          updatedAt: new Date(),
        })
        .where(eq(nfesReceived.nfeNumber, input.nfeNumber));

      return { success: true };
    }),

  /**
   * Rejeitar NFe
   */
  rejectNfe: protectedProcedure
    .input(
      z.object({
        nfeNumber: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(nfesReceived)
        .set({
          status: "rejected",
          notes: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(nfesReceived.nfeNumber, input.nfeNumber));

      return { success: true };
    }),

  /**
   * Obter resumo de NFes (total recebido, pendente, etc)
   */
  getNfeSummary: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      // Construir filtros
      const filters = [];
      if (input.startDate) filters.push(gte(nfesReceived.issueDate, input.startDate));
      if (input.endDate) filters.push(lte(nfesReceived.issueDate, input.endDate));

      // Consultar totais por status
      const result = await db
        .select({
          status: nfesReceived.status,
          count: nfesReceived.id,
          totalAmount: nfesReceived.amount,
        })
        .from(nfesReceived)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .groupBy(nfesReceived.status);

      return {
        received: result.find((r) => r.status === "received") || { count: 0, totalAmount: 0 },
        processed: result.find((r) => r.status === "processed") || { count: 0, totalAmount: 0 },
        reconciled: result.find((r) => r.status === "reconciled") || { count: 0, totalAmount: 0 },
        rejected: result.find((r) => r.status === "rejected") || { count: 0, totalAmount: 0 },
      };
    }),
});
