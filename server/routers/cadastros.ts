
import { protectedProcedure, router } from "../_core/trpc";
import { eq, like, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  employees,
  clients,
  clientUnits,
  jobFunctions,
  clientFunctions,
  shifts,
  costCenters,
  suppliers,
  bankAccounts,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { checkPermission } from "../controle/permissionControl";
import { validatePixKey } from "../controle/pixValidator";
import type { SystemModule } from "../../drizzle/schema";
import {
  bankAccountType,
  cnpjOptional,
  cpfOptional,
  dateStringOptional,
  emailOptional,
  employeeStatus,
  moneyStringOptional,
  pixKeyOptional,
  pixKeyType,
  positiveId,
  requiredText,
} from "@shared/validators";

// Helper para verificar permissão
async function requirePermission(
  userId: number,
  userRole: string | undefined,
  module: SystemModule,
  action: "canView" | "canCreate" | "canEdit" | "canDelete"
) {
  if (userRole === "admin") return;
  const allowed = await checkPermission(userId, module, action);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Sem permissão para ${action} em ${module}`,
    });
  }
}

export const cadastrosRouter = router({
  // ============ EMPLOYEES ============
  employees: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "employees",
          "canView"
        );
        const db = await getDb();
        if (!db) return [];
        let query = db
          .select()
          .from(employees)
          .orderBy(desc(employees.createdAt));
        const results = await query;
        let filtered = results;
        if (input?.search) {
          const s = input.search.toLowerCase();
          filtered = filtered.filter(
            e =>
              e.name.toLowerCase().includes(s) ||
              e.cpf?.includes(s) ||
              e.city?.toLowerCase().includes(s)
          );
        }
        if (input?.status) {
          filtered = filtered.filter(e => e.status === input.status);
        }
        return filtered;
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "employees",
          "canView"
        );
        const db = await getDb();
        if (!db) return null;
        const result = await db
          .select()
          .from(employees)
          .where(eq(employees.id, input))
          .limit(1);
        return result[0] || null;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: requiredText(2, "Nome"),
          cpf: cpfOptional,
          email: emailOptional,
          phone: z.string().optional(),
          city: z.string().optional(),
          pixKey: pixKeyOptional,
          pixKeyType: pixKeyType.optional(),
          status: employeeStatus.default("diarista"),
          registrationDate: dateStringOptional,
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "employees",
          "canCreate"
        );
        // Validar PIX se fornecido
        if (input.pixKey) {
          const pixValidation = validatePixKey(input.pixKey);
          if (!pixValidation.valid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Chave PIX inválida: ${pixValidation.message}`,
            });
          }
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(employees).values({
          ...input,
          email: input.email || null,
          registrationDate: input.registrationDate
            ? new Date(input.registrationDate)
            : null,
        });
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: positiveId,
          name: requiredText(2, "Nome").optional(),
          cpf: cpfOptional,
          email: emailOptional,
          phone: z.string().optional(),
          city: z.string().optional(),
          pixKey: pixKeyOptional,
          pixKeyType: pixKeyType.optional(),
          status: employeeStatus.optional(),
          registrationDate: dateStringOptional,
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "employees",
          "canEdit"
        );
        // Validar PIX se fornecido
        if (input.pixKey) {
          const pixValidation = validatePixKey(input.pixKey);
          if (!pixValidation.valid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Chave PIX inválida: ${pixValidation.message}`,
            });
          }
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await db
          .update(employees)
          .set({
            ...data,
            email: data.email || null,
            registrationDate: data.registrationDate
              ? new Date(data.registrationDate)
              : undefined,
          })
          .where(eq(employees.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "employees",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(employees).where(eq(employees.id, input));
        return { success: true };
      }),

    count: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return 0;
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(employees);
      return result[0]?.count || 0;
    }),
    searchByCpf: protectedProcedure
      .input(z.string())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const cpf = input.replace(/\D/g, '');
        const result = await db
          .select()
          .from(employees)
          .where(like(employees.cpf, `%${cpf}%`))
          .limit(1);
        return result[0] || null;
      }),
  }),

  // ============ CLIENTS ============
  clients: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "clients",
          "canView"
        );
        const db = await getDb();
        if (!db) return [];
        const results = await db
          .select()
          .from(clients)
          .orderBy(desc(clients.createdAt));
        if (input?.search) {
          const s = input.search.toLowerCase();
          return results.filter(
            c => c.name.toLowerCase().includes(s) || c.cnpj?.includes(s)
          );
        }
        return results;
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "clients",
          "canView"
        );
        const db = await getDb();
        if (!db) return null;
        const result = await db
          .select()
          .from(clients)
          .where(eq(clients.id, input))
          .limit(1);
        return result[0] || null;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: requiredText(2, "Nome"),
          cnpj: cnpjOptional,
          city: z.string().optional(),
          address: z.string().optional(),
          contactName: z.string().optional(),
          contactPhone: z.string().optional(),
          contactEmail: emailOptional,
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "clients",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(clients).values(input);
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: positiveId,
          name: requiredText(2, "Nome").optional(),
          cnpj: cnpjOptional,
          city: z.string().optional(),
          address: z.string().optional(),
          contactName: z.string().optional(),
          contactPhone: z.string().optional(),
          contactEmail: emailOptional,
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "clients",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        if (Object.keys(data).length === 0) return { success: true };
        await db.update(clients).set(data).where(eq(clients.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "clients",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(clients).where(eq(clients.id, input));
        return { success: true };
      }),

    count: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return 0;
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(clients);
      return result[0]?.count || 0;
    }),
  }),

  // ============ CLIENT UNITS ============
  clientUnits: router({
    listByClient: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "clients",
          "canView"
        );
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(clientUnits)
          .where(eq(clientUnits.clientId, input));
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: positiveId,
          name: requiredText(1, "Nome"),
          address: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "clients",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(clientUnits).values(input);
        return { id: Number(result[0].insertId) };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "clients",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(clientUnits).where(eq(clientUnits.id, input));
        return { success: true };
      }),
  }),

  // ============ JOB FUNCTIONS ============
  jobFunctions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "functions",
        "canView"
      );
      const db = await getDb();
      if (!db) return [];
      return db.select().from(jobFunctions).orderBy(jobFunctions.name);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: requiredText(2, "Nome da função"),
          defaultPayValue: moneyStringOptional,
          defaultReceiveValue: moneyStringOptional,
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "functions",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(jobFunctions).values(input);
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: positiveId,
          name: requiredText(2, "Nome da função").optional(),
          defaultPayValue: moneyStringOptional,
          defaultReceiveValue: moneyStringOptional,
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "functions",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await db.update(jobFunctions).set(data).where(eq(jobFunctions.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "functions",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(jobFunctions).where(eq(jobFunctions.id, input));
        return { success: true };
      }),
  }),

  // ============ SHIFTS ============
  shifts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(ctx.user.id, ctx.user.role, "shifts", "canView");
      const db = await getDb();
      if (!db) return [];
      return db.select().from(shifts).orderBy(shifts.name);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: requiredText(1, "Nome do turno"),
          startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida (HH:MM)"),
          endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida (HH:MM)"),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "shifts",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(shifts).values(input);
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: positiveId,
          name: z.string().optional(),
          startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida (HH:MM)").optional(),
          endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida (HH:MM)").optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "shifts",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await db.update(shifts).set(data).where(eq(shifts.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "shifts",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(shifts).where(eq(shifts.id, input));
        return { success: true };
      }),
  }),

  // ============ COST CENTERS ============
  costCenters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "cost_centers",
        "canView"
      );
      const db = await getDb();
      if (!db) return [];
      return db.select().from(costCenters).orderBy(costCenters.name);
    }),

    create: protectedProcedure
      .input(z.object({ name: requiredText(2, "Nome"), isActive: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "cost_centers",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(costCenters).values(input);
        return { id: Number(result[0].insertId) };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "cost_centers",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(costCenters).where(eq(costCenters.id, input));
        return { success: true };
      }),
  }),

  // ============ SUPPLIERS ============
  suppliers: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "suppliers",
          "canView"
        );
        const db = await getDb();
        if (!db) return [];
        const results = await db
          .select()
          .from(suppliers)
          .orderBy(suppliers.name);
        if (input?.search) {
          const s = input.search.toLowerCase();
          return results.filter(
            s2 => s2.name.toLowerCase().includes(s) || s2.cnpj?.includes(s)
          );
        }
        return results;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: requiredText(2, "Nome"),
          cnpj: cnpjOptional,
          city: z.string().optional(),
          pixKey: pixKeyOptional,
          contactPhone: z.string().optional(),
          contactEmail: emailOptional,
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "suppliers",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(suppliers).values(input);
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: positiveId,
          name: requiredText(2, "Nome").optional(),
          cnpj: cnpjOptional,
          city: z.string().optional(),
          pixKey: pixKeyOptional,
          contactPhone: z.string().optional(),
          contactEmail: emailOptional,
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "suppliers",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await db.update(suppliers).set(data).where(eq(suppliers.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "suppliers",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(suppliers).where(eq(suppliers.id, input));
        return { success: true };
      }),
  }),

  // ============ BANK ACCOUNTS ============
  bankAccounts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "bank_accounts",
        "canView"
      );
      const db = await getDb();
      if (!db) return [];
      return db.select().from(bankAccounts).orderBy(bankAccounts.name);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: requiredText(2, "Nome"),
          bankName: z.string().optional(),
          accountNumber: z.string().optional(),
          agency: z.string().optional(),
          accountType: bankAccountType.default("checking"),
          initialBalance: moneyStringOptional.default("0"),
          currentBalance: moneyStringOptional.default("0"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "bank_accounts",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(bankAccounts).values(input);
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: positiveId,
          name: z.string().optional(),
          bankName: z.string().optional(),
          accountNumber: z.string().optional(),
          agency: z.string().optional(),
          accountType: bankAccountType.optional(),
          currentBalance: moneyStringOptional,
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "bank_accounts",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "bank_accounts",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(bankAccounts).where(eq(bankAccounts.id, input));
        return { success: true };
      }),
  }),
});
