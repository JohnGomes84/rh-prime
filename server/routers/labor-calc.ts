import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  calcDecimoTerceiro,
  calcFeriasProporcionais,
  calcRescisao,
} from "../utils/labor-calc";

export const laborCalcRouter = router({
  decimoTerceiro: protectedProcedure
    .input(
      z.object({
        salaryGross: z.number().positive().max(1_000_000),
        monthsWorked: z.number().int().min(0).max(12),
      })
    )
    .query(async ({ input }) => calcDecimoTerceiro(input)),

  feriasProporcionais: protectedProcedure
    .input(
      z.object({
        salaryGross: z.number().positive().max(1_000_000),
        monthsWorked: z.number().int().min(0).max(12),
      })
    )
    .query(async ({ input }) => calcFeriasProporcionais(input)),

  rescisao: protectedProcedure
    .input(
      z.object({
        salaryGross: z.number().positive().max(1_000_000),
        hireDate: z.string().min(8),
        terminationDate: z.string().min(8),
        daysWorkedInLastMonth: z.number().int().min(0).max(31).optional(),
        type: z.enum([
          "sem_justa_causa",
          "pedido_demissao",
          "justa_causa",
          "fim_contrato_determinado",
          "acordo_mutuo",
        ]),
        fgtsBalance: z.number().min(0).max(10_000_000).optional(),
        noticeDays: z.number().int().min(0).max(180).optional(),
      })
    )
    .query(async ({ input }) => calcRescisao(input)),
});
