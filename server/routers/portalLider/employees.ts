import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { employees, scheduleAllocations, scheduleFunctions, jobFunctions, workSchedules } from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../../storage";
import { isLeaderOfSchedule } from "./_shared";

export const employeesPortalRouter = router({
  quickRegisterEmployee: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      cpf: z.string(),
      rg: z.string().optional(),
      pixKey: z.string(),
      pixKeyType: z.enum(["cpf", "email", "phone", "random", "cnpj"]),
      docFrontBase64: z.string().optional(),
      docBackBase64: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(employees).where(eq(employees.cpf, input.cpf)).limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "CPF já cadastrado no sistema" });

      let docFrontUrl: string | null = null;
      let docBackUrl: string | null = null;

      if (input.docFrontBase64) {
        try {
          const result = await storagePut(`employees/${input.cpf}/doc-front.jpg`, Buffer.from(input.docFrontBase64, "base64"), "image/jpeg");
          docFrontUrl = result.url;
        } catch {}
      }

      if (input.docBackBase64) {
        try {
          const result = await storagePut(`employees/${input.cpf}/doc-back.jpg`, Buffer.from(input.docBackBase64, "base64"), "image/jpeg");
          docBackUrl = result.url;
        } catch {}
      }

      const result = await db.insert(employees).values({
        name: input.name,
        cpf: input.cpf,
        rg: input.rg || null,
        pixKey: input.pixKey,
        pixKeyType: input.pixKeyType,
        docFrontUrl: docFrontUrl || null,
        docBackUrl: docBackUrl || null,
        status: "diarista",
        registrationDate: new Date(),
      });

      return { id: Number(result[0].insertId), name: input.name };
    }),

  quickExpense: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      cpf: z.string(),
      type: z.enum(["vale", "bonus", "marmita"]),
      value: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao e o lider deste planejamento" });

      const [emp] = await db.select().from(employees).where(eq(employees.cpf, input.cpf)).limit(1);
      if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Funcionario nao encontrado" });

      const [alloc] = await db.select().from(scheduleAllocations)
        .where(and(eq(scheduleAllocations.scheduleId, input.scheduleId), eq(scheduleAllocations.employeeId, emp.id)))
        .limit(1);
      if (!alloc) throw new TRPCError({ code: "NOT_FOUND", message: "Funcionario nao esta alocado neste planejamento" });

      const updateData: Record<string, number> = {};
      if (input.type === "vale") updateData.voucher = input.value;
      else if (input.type === "bonus") updateData.bonus = input.value;
      else if (input.type === "marmita") updateData.mealAllowance = input.value;

      await db.update(scheduleAllocations).set(updateData).where(eq(scheduleAllocations.id, alloc.id));
      return { success: true, allocationId: alloc.id };
    }),

  listExpensesForSchedule: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao e o lider deste planejamento" });

      const db = await getDb();
      if (!db) return [];

      const allocs = await db.select().from(scheduleAllocations).where(eq(scheduleAllocations.scheduleId, input));
      const empIds = Array.from(new Set(allocs.map(a => a.employeeId)));
      const empMap: Record<number, typeof employees.$inferSelect> = {};
      if (empIds.length > 0) {
        const emps = await db.select().from(employees).where(inArray(employees.id, empIds));
        emps.forEach(e => { empMap[e.id] = e; });
      }

      return allocs
        .filter(a => a.voucher || a.bonus || a.mealAllowance)
        .map(a => ({
          id: a.id,
          employeeName: empMap[a.employeeId]?.name || "—",
          employeeCpf: empMap[a.employeeId]?.cpf || "",
          voucher: a.voucher,
          bonus: a.bonus,
          mealAllowance: a.mealAllowance,
          // Efeito líquido sobre a diária: bônus soma; vale e marmita descontam.
          total: (
            parseFloat(String(a.bonus || 0)) -
            parseFloat(String(a.voucher || 0)) -
            parseFloat(String(a.mealAllowance || 0))
          ).toFixed(2),
        }));
    }),

  allocateNewEmployee: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      employeeId: z.number(),
      jobFunctionId: z.number(),
      payValue: z.number(),
      receiveValue: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao e o lider deste planejamento" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(scheduleAllocations)
        .where(and(eq(scheduleAllocations.scheduleId, input.scheduleId), eq(scheduleAllocations.employeeId, input.employeeId)))
        .limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Funcionario ja esta alocado neste planejamento" });

      const [func] = await db.select().from(scheduleFunctions)
        .where(and(eq(scheduleFunctions.scheduleId, input.scheduleId), eq(scheduleFunctions.jobFunctionId, input.jobFunctionId)))
        .limit(1);

      let funcId = func?.id;
      if (!funcId) {
        const result = await db.insert(scheduleFunctions).values([{ scheduleId: input.scheduleId, jobFunctionId: input.jobFunctionId, payValue: input.payValue.toFixed(2), receiveValue: input.receiveValue.toFixed(2) }]);
        funcId = Number(result[0].insertId);
      }

      const result = await db.insert(scheduleAllocations).values([{ scheduleId: input.scheduleId, scheduleFunctionId: funcId, employeeId: input.employeeId, payValue: input.payValue.toFixed(2), receiveValue: input.receiveValue.toFixed(2) }]);
      return { success: true, allocationId: Number(result[0].insertId) };
    }),

  removeAllocation: protectedProcedure
    .input(z.object({ scheduleId: z.number(), allocationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao e o lider deste planejamento" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [schedule] = await db.select().from(workSchedules).where(eq(workSchedules.id, input.scheduleId)).limit(1);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Planejamento nao encontrado" });
      if (schedule.status === "validado") throw new TRPCError({ code: "BAD_REQUEST", message: "Nao e possivel remover diaristas de operacoes validadas" });

      await db.delete(scheduleAllocations)
        .where(and(eq(scheduleAllocations.id, input.allocationId), eq(scheduleAllocations.scheduleId, input.scheduleId)));

      return { success: true };
    }),

  allocationOptions: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(jobFunctions).where(eq(jobFunctions.isActive, true));
  }),
});
