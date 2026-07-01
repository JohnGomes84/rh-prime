import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, managerProcedure, adminProcedure } from "../_core/trpc.js";
import * as db from "../db.js";
import { and, eq, inArray } from "drizzle-orm";
import { demands, demandAttachments, InsertDemand } from "../../drizzle/schema-demands.js";

const CATEGORIES = ["rh_adm", "financeiro", "operacional"] as const;
const PRIORITIES = ["baixa", "normal", "alta", "urgente"] as const;
const STATUSES = [
  "pendente",
  "classificada",
  "em_andamento",
  "aguardando_retorno",
  "concluida",
  "cancelada",
] as const;

/**
 * Demandas Router — Gestão de Demandas Operacionais
 *
 * Fluxo:
 * 1. Solicitante cria demanda (status: pendente)
 * 2. Ediani classifica + direciona para executor (status: classificada)
 * 3. Executor inicia execução (status: em_andamento)
 * 4. Executor retorna com resultado (status: aguardando_retorno)
 * 5. Ediani valida + entrega (status: concluida)
 * 6. Qualquer um pode cancelar
 *
 * Roles:
 * - admin: acesso total
 * - Ediani (classifier): recebe, classifica, aprova
 * - Thalyson (executor RH): executa RH
 * - Johnathan (executor Fin): executa Financeiro
 * - Outros: podem solicitardemandas
 */
export const demandsRouter = router({
  /**
   * Criar uma nova demanda (qualquer user autenticado)
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3).max(255),
        description: z.string().max(5000).optional(),
        category: z.enum(CATEGORIES),
        priority: z.enum(PRIORITIES).default("normal"),
        dueDate: z.string().date(), // YYYY-MM-DD
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const demandDb = await db.getDb();
      if (!demandDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const demandData: InsertDemand = {
        requesterId: ctx.user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        dueDate: new Date(input.dueDate),
        status: "pendente",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await demandDb
        .insert(demands)
        .values(demandData);

      const demandId = result[0]?.insertId;
      if (!demandId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await demandDb.select().from(demands).where(eq(demands.id, demandId)).then(r => r[0]);
    }),

  /**
   * Listar demandas por papel do usuário
   * - Admin: vê todas
   * - Ediani: vê todas as pendentes de classificação
   * - Executor (Thalyson/Johnathan): vê atribuídas a si
   * - Solicitante: vê próprias
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(STATUSES).optional(),
        category: z.enum(CATEGORIES).optional(),
        priority: z.enum(PRIORITIES).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) return [];

      const demandDb = await db.getDb();
      if (!demandDb) return [];

      const conditions: any[] = [];

      // Filtros por input
      if (input?.status) conditions.push(eq(demands.status, input.status));
      if (input?.category) conditions.push(eq(demands.category, input.category));
      if (input?.priority) conditions.push(eq(demands.priority, input.priority));

      // RBAC por papel
      if (ctx.user.role === "admin") {
        // Admin vê tudo
      } else if (ctx.user.email === "ediani@mlservicoseco.com.br") {
        // Ediani vê todas as pendentes de classificação
        conditions.push(eq(demands.status, "pendente"));
      } else if (ctx.user.email === "thalyson.araujo@mlservicoseco.com.br") {
        // Thalyson vê suas demandas RH
        conditions.push(
          inArray(demands.status, ["classificada", "em_andamento", "aguardando_retorno"]),
          eq(demands.executorId, ctx.user.id)
        );
      } else if (ctx.user.email === "adm@mlservicoseco.com.br") {
        // Johnathan vê suas demandas Financeiro
        conditions.push(
          inArray(demands.status, ["classificada", "em_andamento", "aguardando_retorno"]),
          eq(demands.executorId, ctx.user.id)
        );
      } else {
        // Solicitante vê próprias demandas
        conditions.push(eq(demands.requesterId, ctx.user.id));
      }

      const query = conditions.length > 0
        ? demandDb.select().from(demands).where(and(...conditions))
        : demandDb.select().from(demands);

      const results = await query;
      return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }),

  /**
   * Obter detalhe de uma demanda
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

const demandDb = await db.getDb();
      if (!demandDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [demand] = await demandDb
        .select()
        .from(demands)
        .where(eq(demands.id, input.id));

      if (!demand) throw new TRPCError({ code: "NOT_FOUND" });

      // Visibilidade: requester + classifier + executor + admin
      const canView =
        ctx.user.role === "admin" ||
        demand.requesterId === ctx.user.id ||
        demand.classifierId === ctx.user.id ||
        demand.executorId === ctx.user.id;

      if (!canView) throw new TRPCError({ code: "FORBIDDEN" });

      const attachments = await demandDb
        .select()
        .from(demandAttachments)
        .where(eq(demandAttachments.demandId, demand.id));

      return { demand, attachments };
    }),

  /**
   * Ediani classifica demanda + direciona para executor
   */
  classify: managerProcedure
    .input(
      z.object({
        demandId: z.number().int().positive(),
        executorId: z.number().int().positive(),
        priority: z.enum(PRIORITIES).optional(),
        classificationNotes: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
const demandDb = await db.getDb();
      if (!demandDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [demand] = await demandDb
        .select()
        .from(demands)
        .where(eq(demands.id, input.demandId));

      if (!demand) throw new TRPCError({ code: "NOT_FOUND" });
      if (demand.status !== "pendente")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas demandas pendentes podem ser classificadas" });

      // Atualizar: classifier_id, executor_id, status, priority, classification_notes
      const now = new Date();
      await demandDb
        .update(demands)
        .set({
          classifierId: ctx.user.id,
          executorId: input.executorId,
          status: "classificada",
          priority: input.priority || demand.priority,
          classificationNotes: input.classificationNotes,
          classifiedAt: now,
          updatedAt: now,
        })
        .where(eq(demands.id, input.demandId));

      return { success: true };
    }),

  /**
   * Executor inicia execução
   */
  startExecution: protectedProcedure
    .input(z.object({ demandId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
const demandDb = await db.getDb();
      if (!demandDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [demand] = await demandDb
        .select()
        .from(demands)
        .where(eq(demands.id, input.demandId));

      if (!demand) throw new TRPCError({ code: "NOT_FOUND" });
      if (demand.executorId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Não é o executor da demanda" });
      if (demand.status !== "classificada")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas demandas classificadas podem iniciar" });

      const now = new Date();
      await demandDb
        .update(demands)
        .set({
          status: "em_andamento",
          startedAt: now,
          updatedAt: now,
        })
        .where(eq(demands.id, input.demandId));

      return { success: true };
    }),

  /**
   * Executor retorna demanda para validação de Ediani
   */
  returnForReview: protectedProcedure
    .input(
      z.object({
        demandId: z.number().int().positive(),
        returnNotes: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
const demandDb = await db.getDb();
      if (!demandDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [demand] = await demandDb
        .select()
        .from(demands)
        .where(eq(demands.id, input.demandId));

      if (!demand) throw new TRPCError({ code: "NOT_FOUND" });
      if (demand.executorId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Não é o executor da demanda" });
      if (demand.status !== "em_andamento")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas demandas em andamento podem ser retornadas" });

      const now = new Date();
      await demandDb
        .update(demands)
        .set({
          status: "aguardando_retorno",
          returnedAt: now,
          returnNotes: input.returnNotes,
          updatedAt: now,
        })
        .where(eq(demands.id, input.demandId));

      return { success: true };
    }),

  /**
   * Ediani valida + entrega demanda (marca como concluída)
   */
  complete: managerProcedure
    .input(
      z.object({
        demandId: z.number().int().positive(),
        completionNotes: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
const demandDb = await db.getDb();
      if (!demandDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [demand] = await demandDb
        .select()
        .from(demands)
        .where(eq(demands.id, input.demandId));

      if (!demand) throw new TRPCError({ code: "NOT_FOUND" });
      if (demand.status !== "aguardando_retorno")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas demandas aguardando retorno podem ser concluídas",
        });

      const now = new Date();
      const wasOnTime = now <= new Date(`${demand.dueDate}T23:59:59`);

      await demandDb
        .update(demands)
        .set({
          status: "concluida",
          completedAt: now,
          wasOnTime,
          completionNotes: input.completionNotes,
          updatedAt: now,
        })
        .where(eq(demands.id, input.demandId));

      return { success: true, wasOnTime };
    }),

  /**
   * Cancelar demanda (qualquer um pode cancelar a própria)
   */
  cancel: protectedProcedure
    .input(z.object({ demandId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
const demandDb = await db.getDb();
      if (!demandDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [demand] = await demandDb
        .select()
        .from(demands)
        .where(eq(demands.id, input.demandId));

      if (!demand) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        ctx.user.role !== "admin" &&
        demand.requesterId !== ctx.user.id &&
        demand.classifierId !== ctx.user.id
      )
        throw new TRPCError({ code: "FORBIDDEN" });

      const now = new Date();
      await demandDb
        .update(demands)
        .set({ status: "cancelada", updatedAt: now })
        .where(eq(demands.id, input.demandId));

      return { success: true };
    }),

  /**
   * Contar demandas por status (para dashboard)
   */
  counts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return { pendente: 0, classificada: 0, em_andamento: 0, aguardando_retorno: 0, concluida: 0 };

    const { demands } = await import("../../drizzle/schema.js");
    const demandDb = await db.getDb();
    if (!demandDb) return { pendente: 0, classificada: 0, em_andamento: 0, aguardando_retorno: 0, concluida: 0 };

    // Para Ediani: contar pendentes de classificar
    if (ctx.user.email === "ediani@mlservicoseco.com.br") {
      const result = await demandDb
        .select({
          status: demands.status,
          count: demands.id,
        })
        .from(demands)
        .where(eq(demands.status, "pendente"));

      return {
        pendente: result.length,
        classificada: 0,
        em_andamento: 0,
        aguardando_retorno: 0,
        concluida: 0,
      };
    }

    return { pendente: 0, classificada: 0, em_andamento: 0, aguardando_retorno: 0, concluida: 0 };
  }),
});

