import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";

export const departmentsRouter = router({
  list: protectedProcedure.query(async () => db.listDepartments()),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(120),
        parentId: z.number().int().positive().optional(),
        headEmployeeId: z.number().int().positive().optional(),
        costCenter: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ input }) => db.createDepartment(input as any)),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(2).max(120).optional(),
        parentId: z.number().int().positive().nullable().optional(),
        headEmployeeId: z.number().int().positive().nullable().optional(),
        costCenter: z.string().max(50).optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return db.updateDepartment(id, rest as any);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => db.deleteDepartment(input.id)),
});
