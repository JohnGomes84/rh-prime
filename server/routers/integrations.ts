import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { validateCPF, validateCNPJ, fetchAddressByCEP } from "../integrations/cpf-validator";
import { sendEmail } from "../integrations/email-service";
import { registerWebhook, triggerWebhook, unregisterWebhook, listWebhooks } from "../integrations/webhooks";

export const integrationsRouter = router({
  // CEP Integration
  fetchAddressByCEP: protectedProcedure
    .input(z.object({ cep: z.string() }))
    .query(async ({ input }) => {
      const address = await fetchAddressByCEP(input.cep);
      if (!address) {
        throw new Error("CEP não encontrado");
      }
      return address;
    }),

  // CNPJ Validation
  validateCNPJ: protectedProcedure
    .input(z.object({ cnpj: z.string() }))
    .query(async ({ input }) => {
      return validateCNPJ(input.cnpj);
    }),

  // CPF Validation
  validateCPF: protectedProcedure
    .input(z.object({ cpf: z.string() }))
    .query(async ({ input }) => {
      return validateCPF(input.cpf);
    }),

  // Email Service
  sendEmail: protectedProcedure
    .input(z.object({
      to: z.string().email(),
      subject: z.string(),
      html: z.string(),
      from: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const success = await sendEmail(input);
      if (!success) {
        throw new Error("Falha ao enviar email");
      }
      return { success: true };
    }),

  // Webhook Management
  registerWebhook: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      event: z.enum([
        "employee.created",
        "employee.updated",
        "employee.deleted",
        "vacation.requested",
        "vacation.approved",
        "vacation.rejected",
        "aso.expiring",
        "pgr.expiring",
        "pcmso.expiring",
        "critical.alert",
      ]),
    }))
    .mutation(async ({ input }) => {
      const webhook = registerWebhook(input.url, input.event);
      return webhook;
    }),

  unregisterWebhook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const success = unregisterWebhook(input.id);
      return { success };
    }),

  listWebhooks: protectedProcedure.query(async () => {
    return listWebhooks();
  }),
});
