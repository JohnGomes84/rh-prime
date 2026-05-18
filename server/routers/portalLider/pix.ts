import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../../_core/trpc";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { employees, pixChangeRequests } from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const pixRouter = router({
  requestPixChange: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      cpf: z.string().optional(),
      newPixKey: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let emp: typeof employees.$inferSelect | undefined;
      if (input.employeeId) {
        const [r] = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
        emp = r;
      } else if (input.cpf) {
        const [r] = await db.select().from(employees).where(eq(employees.cpf, input.cpf)).limit(1);
        emp = r;
      }

      if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Funcionario nao encontrado" });

      const [existingPending] = await db
        .select()
        .from(pixChangeRequests)
        .where(and(eq(pixChangeRequests.employeeId, emp.id), eq(pixChangeRequests.status, "pendente")))
        .limit(1);

      if (existingPending) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Já existe solicitação pendente para este funcionário" });
      }

      const result = await db.insert(pixChangeRequests).values([{
        employeeId: emp.id,
        requestedByUserId: ctx.user.id,
        oldPixKey: emp.pixKey || null,
        newPixKey: input.newPixKey,
        status: "pendente",
      }]);

      const { notifyAdmins } = await import("../../_core/sse");
      notifyAdmins({
        type: "pix_request_created",
        data: {
          requestId: Number(result[0].insertId),
          employeeName: emp.name,
          employeeCpf: emp.cpf,
          newPixKey: input.newPixKey,
          createdAt: new Date().toISOString(),
        },
      });

      return { success: true, message: "Solicitacao de alteracao PIX enviada para aprovacao" };
    }),

  listPixRequests: adminProcedure
    .input(z.object({ status: z.enum(["pendente", "aprovado", "rejeitado"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const requests = input?.status
        ? await db.select().from(pixChangeRequests).where(eq(pixChangeRequests.status, input.status))
        : await db.select().from(pixChangeRequests);

      const empIds = Array.from(new Set(requests.map(r => r.employeeId)));
      const empMap: Record<number, typeof employees.$inferSelect> = {};
      if (empIds.length > 0) {
        const emps = await db.select().from(employees).where(inArray(employees.id, empIds));
        emps.forEach(e => { empMap[e.id] = e; });
      }

      return requests.map(r => ({
        ...r,
        employeeName: empMap[r.employeeId]?.name || "—",
        employeeCpf: empMap[r.employeeId]?.cpf || "",
        currentPixKey: empMap[r.employeeId]?.pixKey || "",
        pixKeyType: empMap[r.employeeId]?.pixKeyType || "",
      }));
    }),

  reviewPixRequest: adminProcedure
    .input(z.object({
      requestId: z.number(),
      approved: z.boolean(),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [request] = await db.select().from(pixChangeRequests).where(eq(pixChangeRequests.id, input.requestId)).limit(1);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      if (request.status !== "pendente") throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitação já revisada" });

      const [emp] = await db.select().from(employees).where(eq(employees.id, request.employeeId)).limit(1);

      const { notifyAdmins } = await import("../../_core/sse");

      if (input.approved) {
        await db.update(employees).set({ pixKey: request.newPixKey }).where(eq(employees.id, request.employeeId));
        await db.update(pixChangeRequests).set({ status: "aprovado", reviewedByUserId: ctx.user.id, reviewNotes: input.reviewNotes || null }).where(eq(pixChangeRequests.id, input.requestId));
        notifyAdmins({ type: "pix_request_reviewed", data: { requestId: input.requestId, employeeName: emp?.name || "Funcionario", status: "aprovado", reviewedByName: ctx.user.name, reviewNotes: input.reviewNotes, reviewedAt: new Date().toISOString() } });
      } else {
        notifyAdmins({ type: "pix_request_reviewed", data: { requestId: input.requestId, employeeName: emp?.name || "Funcionario", status: "rejeitado", reviewedByName: ctx.user.name, reviewNotes: input.reviewNotes, reviewedAt: new Date().toISOString() } });
        await db.update(pixChangeRequests).set({ status: "rejeitado", reviewedByUserId: ctx.user.id, reviewNotes: input.reviewNotes || null }).where(eq(pixChangeRequests.id, input.requestId));
        const { notifyPixRequestReviewed } = await import("../../lib/sse-notifications");
        notifyPixRequestReviewed({ requestId: input.requestId, employeeName: emp?.name || "Funcionario", status: "rejeitado", reviewedByUserId: ctx.user.id, reviewNotes: input.reviewNotes, reviewedAt: new Date().toISOString() });
      }

      return { success: true };
    }),
});
