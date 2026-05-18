import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { scheduleAllocations, workSchedules, shifts, clients } from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import {
  buildShiftWindow,
  createAutomaticOccurrenceIfNeeded,
  getOccurrenceSeverity,
  getShiftDurationHours,
} from "../../lib/schedule-occurrences";
import { isLeaderOfSchedule, getScheduleWithShift } from "./_shared";

export const attendanceRouter = router({
  checkIn: protectedProcedure
    .input(z.object({ allocationId: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Você não é o líder deste planejamento" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();

      const [allocation] = await db.select().from(scheduleAllocations).where(eq(scheduleAllocations.id, input.allocationId)).limit(1);
      if (!allocation) throw new TRPCError({ code: "NOT_FOUND", message: "Alocação não encontrada" });

      await db.update(scheduleAllocations).set({ checkInTime: now }).where(eq(scheduleAllocations.id, input.allocationId));

      const { schedule, shift } = await getScheduleWithShift(input.scheduleId);
      if (schedule && allocation.employeeId) {
        const { start } = buildShiftWindow(new Date(schedule.date), shift);
        const diffMinutes = (now.getTime() - start.getTime()) / (1000 * 60);
        if (diffMinutes > 15) {
          await createAutomaticOccurrenceIfNeeded({ db, scheduleId: input.scheduleId, employeeId: allocation.employeeId, type: "late", description: "Atraso no check-in", createdBy: ctx.user.id });
        }
      }

      return { success: true };
    }),

  checkOut: protectedProcedure
    .input(z.object({ allocationId: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Você não é o líder deste planejamento" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();

      const [allocation] = await db.select().from(scheduleAllocations).where(eq(scheduleAllocations.id, input.allocationId)).limit(1);
      if (!allocation) throw new TRPCError({ code: "NOT_FOUND", message: "Alocação não encontrada" });

      await db.update(scheduleAllocations).set({ checkOutTime: now }).where(eq(scheduleAllocations.id, input.allocationId));

      const { schedule, shift } = await getScheduleWithShift(input.scheduleId);
      if (schedule && allocation.employeeId) {
        const { end } = buildShiftWindow(new Date(schedule.date), shift);
        const minutesBeforeEnd = (end.getTime() - now.getTime()) / (1000 * 60);
        if (minutesBeforeEnd > 60) {
          await createAutomaticOccurrenceIfNeeded({ db, scheduleId: input.scheduleId, employeeId: allocation.employeeId, type: "early_exit", description: "Saída antecipada", createdBy: ctx.user.id });
        }
      }

      return { success: true };
    }),

  setAttendance: protectedProcedure
    .input(z.object({
      allocationId: z.number(),
      scheduleId: z.number(),
      status: z.enum(["presente", "faltou", "parcial"]),
      notes: z.string().optional(),
      partialHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input.scheduleId);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Você não é o líder deste planejamento" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [alloc] = await db.select().from(scheduleAllocations).where(eq(scheduleAllocations.id, input.allocationId)).limit(1);
      if (!alloc) throw new TRPCError({ code: "NOT_FOUND", message: "Alocação não encontrada" });

      const [schedule] = await db.select().from(workSchedules).where(eq(workSchedules.id, input.scheduleId)).limit(1);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Planejamento não encontrado" });

      const [shiftForAttendance] = schedule.shiftId
        ? await db.select().from(shifts).where(eq(shifts.id, schedule.shiftId)).limit(1)
        : [null];
      const computedShiftHours = getShiftDurationHours(shiftForAttendance);

      let partialPayValue = alloc.payValue;
      if (input.status === "parcial" && input.partialHours) {
        const payValueNum = parseFloat(String(alloc.payValue || 0));
        partialPayValue = ((payValueNum * input.partialHours) / computedShiftHours).toFixed(2);
      }

      await db.update(scheduleAllocations)
        .set({
          attendanceStatus: input.status,
          allocNotes: input.notes || null,
          payValue: input.status === "parcial" && input.partialHours ? partialPayValue : alloc.payValue,
        })
        .where(eq(scheduleAllocations.id, input.allocationId));

      if (input.status === "faltou") {
        await createAutomaticOccurrenceIfNeeded({ db, scheduleId: input.scheduleId, employeeId: alloc.employeeId, type: "absence", description: input.notes?.trim() || "Falta registrada pelo líder.", createdBy: ctx.user.id });
      }

      if (input.status === "parcial" && input.partialHours && input.partialHours < computedShiftHours / 2) {
        await createAutomaticOccurrenceIfNeeded({ db, scheduleId: input.scheduleId, employeeId: alloc.employeeId, type: "other", description: "Meio período não justificado", createdBy: ctx.user.id });
      }

      return { success: true };
    }),

  closeAttendance: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      const isLeader = await isLeaderOfSchedule(ctx.user.id, input);
      if (!isLeader) throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao e o lider deste planejamento" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allocs = await db.select().from(scheduleAllocations).where(eq(scheduleAllocations.scheduleId, input));
      const unmarked = allocs.filter(a => !a.attendanceStatus);
      if (unmarked.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Nem todos os diaristas tem presenca marcada" });

      await db.update(scheduleAllocations).set({ checkOutTime: new Date() }).where(eq(scheduleAllocations.scheduleId, input));

      const [schedule] = await db.select().from(workSchedules).where(eq(workSchedules.id, input)).limit(1);
      const [client] = schedule ? await db.select().from(clients).where(eq(clients.id, schedule.clientId)).limit(1) : [null];

      await db.update(workSchedules).set({ status: "validado" }).where(eq(workSchedules.id, input));

      const { notifyAttendanceClosed } = await import("../../lib/sse-notifications");
      notifyAttendanceClosed({ scheduleId: input, clientName: client?.name || "Sem nome", totalPeople: allocs.length, leaderId: ctx.user.id });

      return { success: true };
    }),
});
