import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import {
  lookupCep,
  lookupCnpj,
  listHolidays,
  listStates,
  listCitiesByState,
} from "../integrations/brasil-api.js";

export const lookupRouter = router({
  cep: protectedProcedure
    .input(z.object({ cep: z.string().min(8).max(9) }))
    .query(async ({ input }) => {
      return lookupCep(input.cep);
    }),

  cnpj: protectedProcedure
    .input(z.object({ cnpj: z.string().min(14).max(18) }))
    .query(async ({ input }) => {
      return lookupCnpj(input.cnpj);
    }),

  holidays: protectedProcedure
    .input(z.object({ year: z.number().int().min(1900).max(2100) }))
    .query(async ({ input }) => {
      return listHolidays(input.year);
    }),

  states: protectedProcedure.query(async () => {
    return listStates();
  }),

  cities: protectedProcedure
    .input(z.object({ uf: z.string().length(2) }))
    .query(async ({ input }) => {
      return listCitiesByState(input.uf);
    }),
});
