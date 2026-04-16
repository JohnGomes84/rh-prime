import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  accountsPayable,
  accountsReceivable,
  paymentBatches,
  paymentBatchItems,
  employees,
  clients,
  suppliers,
  bankAccounts,
  scheduleAllocations,
  workSchedules,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { checkPermission } from "../controle/permissionControl";
import type { SystemModule } from "../../drizzle/schema";
import {
  assertPayableTransition,
  assertPaymentBatchTransition,
  assertReceivableTransition,
} from "../_core/stateGuards";
import {
  assertBatchCanBePaid,
  calculatePaymentBatchItemTotal,
} from "../_core/criticalFlows";

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

export const financeiroRouter = router({
  // ============ ACCOUNTS PAYABLE ============
  payable: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_payable",
          "canView"
        );
        const db = await getDb();
        if (!db) return [];
        let results = await db
          .select()
          .from(accountsPayable)
          .orderBy(desc(accountsPayable.dueDate));
        if (input?.status) {
          results = results.filter(r => r.status === input.status);
        }
        if (input?.startDate) {
          const start = new Date(input.startDate);
          results = results.filter(r => new Date(r.dueDate) >= start);
        }
        if (input?.endDate) {
          const end = new Date(input.endDate);
          results = results.filter(r => new Date(r.dueDate) <= end);
        }
        return results;
      }),

    summary: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "accounts_payable",
        "canView"
      );
      const db = await getDb();
      if (!db)
        return {
          totalPending: "0",
          totalPaid: "0",
          totalOverdue: "0",
          count: 0,
        };

      const all = await db.select().from(accountsPayable);
      const now = new Date();
      let totalPending = 0,
        totalPaid = 0,
        totalOverdue = 0;

      for (const item of all) {
        const amount = parseFloat(item.amount);
        if (item.status === "pago") totalPaid += amount;
        else if (
          item.status === "vencido" ||
          (item.status === "pendente" && new Date(item.dueDate) < now)
        )
          totalOverdue += amount;
        else if (item.status === "pendente") totalPending += amount;
      }

      return {
        totalPending: totalPending.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalOverdue: totalOverdue.toFixed(2),
        count: all.length,
      };
    }),

    create: protectedProcedure
      .input(
        z.object({
          description: z.string().min(2),
          supplierId: z.number().optional(),
          clientId: z.number().optional(),
          costCenterId: z.number().optional(),
          bankAccountId: z.number().optional(),
          amount: z.string(),
          dueDate: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_payable",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(accountsPayable).values({
          ...input,
          dueDate: new Date(input.dueDate),
        });
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          description: z.string().optional(),
          supplierId: z.number().nullable().optional(),
          clientId: z.number().nullable().optional(),
          costCenterId: z.number().nullable().optional(),
          bankAccountId: z.number().nullable().optional(),
          amount: z.string().optional(),
          dueDate: z.string().optional(),
          paymentDate: z.string().nullable().optional(),
          status: z
            .enum(["pendente", "pago", "vencido", "cancelado"])
            .optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_payable",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        const [current] = await db
          .select()
          .from(accountsPayable)
          .where(eq(accountsPayable.id, id))
          .limit(1);
        if (!current)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conta a pagar não encontrada",
          });
        if (current.status === "pago") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Conta já paga não pode ser editada",
          });
        }
        const updateData: any = { ...data };
        if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
        if (data.paymentDate)
          updateData.paymentDate = new Date(data.paymentDate);
        if (data.status) assertPayableTransition(current.status, data.status);
        await db
          .update(accountsPayable)
          .set(updateData)
          .where(eq(accountsPayable.id, id));
        return { success: true };
      }),

    markPaid: protectedProcedure
      .input(z.object({ id: z.number(), paymentDate: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_payable",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [current] = await db
          .select()
          .from(accountsPayable)
          .where(eq(accountsPayable.id, input.id))
          .limit(1);
        if (!current)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conta a pagar não encontrada",
          });
        assertPayableTransition(current.status, "pago");
        await db
          .update(accountsPayable)
          .set({
            status: "pago",
            paymentDate: input.paymentDate
              ? new Date(input.paymentDate)
              : new Date(),
          })
          .where(eq(accountsPayable.id, input.id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_payable",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(accountsPayable).where(eq(accountsPayable.id, input));
        return { success: true };
      }),
  }),

  // ============ ACCOUNTS RECEIVABLE ============
  receivable: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_receivable",
          "canView"
        );
        const db = await getDb();
        if (!db) return [];
        let results = await db
          .select()
          .from(accountsReceivable)
          .orderBy(desc(accountsReceivable.dueDate));
        if (input?.status)
          results = results.filter(r => r.status === input.status);
        if (input?.startDate) {
          const start = new Date(input.startDate);
          results = results.filter(r => new Date(r.dueDate) >= start);
        }
        if (input?.endDate) {
          const end = new Date(input.endDate);
          results = results.filter(r => new Date(r.dueDate) <= end);
        }
        return results;
      }),

    summary: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "accounts_receivable",
        "canView"
      );
      const db = await getDb();
      if (!db)
        return {
          totalPending: "0",
          totalReceived: "0",
          totalOverdue: "0",
          count: 0,
        };

      const all = await db.select().from(accountsReceivable);
      const now = new Date();
      let totalPending = 0,
        totalReceived = 0,
        totalOverdue = 0;

      for (const item of all) {
        const amount = parseFloat(item.amount);
        if (item.status === "recebido") totalReceived += amount;
        else if (
          item.status === "vencido" ||
          (item.status === "pendente" && new Date(item.dueDate) < now)
        )
          totalOverdue += amount;
        else if (item.status === "pendente") totalPending += amount;
      }

      return {
        totalPending: totalPending.toFixed(2),
        totalReceived: totalReceived.toFixed(2),
        totalOverdue: totalOverdue.toFixed(2),
        count: all.length,
      };
    }),

    create: protectedProcedure
      .input(
        z.object({
          description: z.string().min(2),
          clientId: z.number().optional(),
          costCenterId: z.number().optional(),
          bankAccountId: z.number().optional(),
          amount: z.string(),
          dueDate: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_receivable",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(accountsReceivable).values({
          ...input,
          dueDate: new Date(input.dueDate),
        });
        return { id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          description: z.string().optional(),
          clientId: z.number().nullable().optional(),
          costCenterId: z.number().nullable().optional(),
          bankAccountId: z.number().nullable().optional(),
          amount: z.string().optional(),
          dueDate: z.string().optional(),
          receiveDate: z.string().nullable().optional(),
          status: z
            .enum(["pendente", "recebido", "vencido", "cancelado"])
            .optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_receivable",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        const [current] = await db
          .select()
          .from(accountsReceivable)
          .where(eq(accountsReceivable.id, id))
          .limit(1);
        if (!current)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conta a receber não encontrada",
          });
        if (current.status === "recebido") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Conta já recebida não pode ser editada",
          });
        }
        const updateData: any = { ...data };
        if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
        if (data.receiveDate)
          updateData.receiveDate = new Date(data.receiveDate);
        if (data.status)
          assertReceivableTransition(current.status, data.status);
        await db
          .update(accountsReceivable)
          .set(updateData)
          .where(eq(accountsReceivable.id, id));
        return { success: true };
      }),

    markReceived: protectedProcedure
      .input(z.object({ id: z.number(), receiveDate: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_receivable",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [current] = await db
          .select()
          .from(accountsReceivable)
          .where(eq(accountsReceivable.id, input.id))
          .limit(1);
        if (!current)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conta a receber não encontrada",
          });
        assertReceivableTransition(current.status, "recebido");
        await db
          .update(accountsReceivable)
          .set({
            status: "recebido",
            receiveDate: input.receiveDate
              ? new Date(input.receiveDate)
              : new Date(),
          })
          .where(eq(accountsReceivable.id, input.id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "accounts_receivable",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db
          .delete(accountsReceivable)
          .where(eq(accountsReceivable.id, input));
        return { success: true };
      }),
  }),

  // ============ PAYMENT RECORDS ============
  payments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "payment_batches",
        "canView"
      );

      const db = await getDb();
      if (!db) return [];

      const [allocations, schedules, employeeList, clientList] = await Promise.all([
        db.select().from(scheduleAllocations),
        db.select().from(workSchedules),
        db.select().from(employees),
        db.select().from(clients),
      ]);

      const scheduleMap = new Map(schedules.map(item => [item.id, item]));
      const employeeMap = new Map(employeeList.map(item => [item.id, item]));
      const clientMap = new Map(clientList.map(item => [item.id, item]));

      return allocations
        .map(allocation => {
          const schedule = scheduleMap.get(allocation.scheduleId);
          const employee = employeeMap.get(allocation.employeeId);
          const client = schedule ? clientMap.get(schedule.clientId) : null;
          if (!schedule || !employee) return null;
          if (schedule.status !== "validado") return null;

          const baseValue = Number(allocation.payValue || 0);
          const mealAllowance = Number(allocation.mealAllowance || 0);
          const voucher = Number(allocation.voucher || 0);
          const bonus = Number(allocation.bonus || 0);
          const totalToPay = baseValue - mealAllowance - voucher + bonus;
          const scheduleDate = new Date(schedule.date);
          const period = `${scheduleDate.getFullYear()}-${String(
            scheduleDate.getMonth() + 1
          ).padStart(2, "0")}`;

          return {
            id: allocation.id,
            employeeId: employee.id,
            employeeName: employee.name,
            employeeCpf: employee.cpf || "",
            clientId: schedule.clientId,
            clientName: client?.name || "—",
            scheduleId: schedule.id,
            scheduleDate: schedule.date,
            period,
            daysWorked: 1,
            baseValue,
            mealAllowance,
            voucher,
            bonus,
            totalToPay,
            pixKey: employee.pixKey || "",
            pixType: employee.pixKeyType || null,
            status: allocation.paymentBatchId ? "paid" : employee.pixKey ? "pending" : "no_pix",
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort(
          (a, b) =>
            new Date(b.scheduleDate).getTime() - new Date(a.scheduleDate).getTime()
        );
    }),
  }),

  // ============ PAYMENT BATCHES ============
  batches: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "payment_batches",
        "canView"
      );
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(paymentBatches)
        .orderBy(desc(paymentBatches.createdAt));
    }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "payment_batches",
          "canView"
        );
        const db = await getDb();
        if (!db) return null;
        const batch = await db
          .select()
          .from(paymentBatches)
          .where(eq(paymentBatches.id, input))
          .limit(1);
        if (!batch[0]) return null;
        const items = await db
          .select()
          .from(paymentBatchItems)
          .where(eq(paymentBatchItems.batchId, input));
        return { ...batch[0], items };
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(2),
          periodStart: z.string(),
          periodEnd: z.string(),
          bankAccountId: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "payment_batches",
          "canCreate"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(paymentBatches).values({
          ...input,
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
        });
        return { id: Number(result[0].insertId) };
      }),

    addItem: protectedProcedure
      .input(
        z.object({
          batchId: z.number(),
          employeeId: z.number(),
          daysWorked: z.number().default(0),
          dailyRate: z.string().default("0"),
          mealAllowance: z.string().default("0"),
          bonus: z.string().default("0"),
          voucher: z.string().default("0"),
          pixKey: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "payment_batches",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [batch] = await db
          .select()
          .from(paymentBatches)
          .where(eq(paymentBatches.id, input.batchId))
          .limit(1);
        if (!batch)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lote não encontrado",
          });
        if (batch.status !== "pendente") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível alterar lote já fechado",
          });
        }
        const duplicate = await db
          .select()
          .from(paymentBatchItems)
          .where(
            and(
              eq(paymentBatchItems.batchId, input.batchId),
              eq(paymentBatchItems.employeeId, input.employeeId)
            )
          )
          .limit(1);
        if (duplicate.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Funcionário já existe neste lote",
          });
        }

        const total = calculatePaymentBatchItemTotal({
          daysWorked: input.daysWorked,
          dailyRate: input.dailyRate,
          mealAllowance: input.mealAllowance,
          bonus: input.bonus,
          voucher: input.voucher,
        });

        const result = await db.insert(paymentBatchItems).values({
          ...input,
          totalAmount: total,
        });

        // Atualizar totais do lote
        const items = await db
          .select()
          .from(paymentBatchItems)
          .where(eq(paymentBatchItems.batchId, input.batchId));
        const batchTotal = items.reduce(
          (sum, i) => sum + parseFloat(i.totalAmount || "0"),
          0
        );
        await db
          .update(paymentBatches)
          .set({
            totalAmount: batchTotal.toFixed(2),
            employeeCount: items.length,
          })
          .where(eq(paymentBatches.id, input.batchId));

        return {
          id: Number(result[0].insertId),
          totalAmount: total,
        };
      }),

    removeItem: protectedProcedure
      .input(z.object({ itemId: z.number(), batchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "payment_batches",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [batch] = await db
          .select()
          .from(paymentBatches)
          .where(eq(paymentBatches.id, input.batchId))
          .limit(1);
        if (!batch)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lote não encontrado",
          });
        if (batch.status !== "pendente") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível alterar lote já fechado",
          });
        }
        await db
          .delete(paymentBatchItems)
          .where(eq(paymentBatchItems.id, input.itemId));

        // Recalcular totais
        const items = await db
          .select()
          .from(paymentBatchItems)
          .where(eq(paymentBatchItems.batchId, input.batchId));
        const batchTotal = items.reduce(
          (sum, i) => sum + parseFloat(i.totalAmount || "0"),
          0
        );
        await db
          .update(paymentBatches)
          .set({
            totalAmount: batchTotal.toFixed(2),
            employeeCount: items.length,
          })
          .where(eq(paymentBatches.id, input.batchId));

        return { success: true };
      }),

    markPaid: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "payment_batches",
          "canEdit"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [batch] = await db
          .select()
          .from(paymentBatches)
          .where(eq(paymentBatches.id, input))
          .limit(1);
        if (!batch)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lote não encontrado",
          });
        assertPaymentBatchTransition(batch.status, "pago");
        const items = await db
          .select()
          .from(paymentBatchItems)
          .where(eq(paymentBatchItems.batchId, input));
        assertBatchCanBePaid({
          status: batch.status,
          itemsCount: items.length,
          hasPaidItem: items.some(i => i.status === "pago"),
        });
        await db
          .update(paymentBatches)
          .set({ status: "pago", paidAt: new Date() })
          .where(eq(paymentBatches.id, input));
        await db
          .update(paymentBatchItems)
          .set({ status: "pago" })
          .where(eq(paymentBatchItems.batchId, input));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await requirePermission(
          ctx.user.id,
          ctx.user.role,
          "payment_batches",
          "canDelete"
        );
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db
          .delete(paymentBatchItems)
          .where(eq(paymentBatchItems.batchId, input));
        await db.delete(paymentBatches).where(eq(paymentBatches.id, input));
        return { success: true };
      }),
  }),

  // ============ DASHBOARD KPIs ============
  dashboard: router({
    kpis: protectedProcedure.query(async ({ ctx }) => {
      await requirePermission(
        ctx.user.id,
        ctx.user.role,
        "dashboard",
        "canView"
      );
      const db = await getDb();
      if (!db)
        return {
          revenue: "0",
          costs: "0",
          margin: "0",
          totalJobs: 0,
          employeeCount: 0,
          clientCount: 0,
        };

      const [payableAll, receivableAll, empCount, cliCount] = await Promise.all(
        [
          db.select().from(accountsPayable),
          db.select().from(accountsReceivable),
          db.select({ count: sql<number>`count(*)` }).from(employees),
          db.select({ count: sql<number>`count(*)` }).from(clients),
        ]
      );

      const revenue = receivableAll
        .filter(r => r.status === "recebido")
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);

      const costs = payableAll
        .filter(r => r.status === "pago")
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);

      const margin = revenue - costs;

      return {
        revenue: revenue.toFixed(2),
        costs: costs.toFixed(2),
        margin: margin.toFixed(2),
        totalJobs: payableAll.length + receivableAll.length,
        employeeCount: empCount[0]?.count || 0,
        clientCount: cliCount[0]?.count || 0,
      };
    }),
  }),
});
