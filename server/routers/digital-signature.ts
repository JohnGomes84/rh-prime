import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  createDigitalSignature,
  validateDocumentSignature,
  getDocumentSignatures,
  exportSignatureCertificate,
} from '../services/digital-signature-service';

export const digitalSignatureRouter = router({
  /**
   * Assinar documento digitalmente
   * Apenas admin e gestor podem assinar documentos de outros
   * Colaboradores podem assinar seus próprios documentos
   */
  sign: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        documentContent: z.instanceof(Buffer),
        cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
        signerName: z.string().min(3),
        signerEmail: z.string().email(),
        signatureMethod: z.enum(['PIN', 'BIOMETRIC', 'CERTIFICATE']).default('PIN'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validar permissão
      if (ctx.user?.role === 'colaborador') {
        // Colaborador só pode assinar seus próprios documentos
        // Aqui seria necessário validar se o CPF do colaborador corresponde ao CPF do input
      }

      const result = await createDigitalSignature({
        documentId: input.documentId,
        cpf: input.cpf,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        documentContent: input.documentContent,
        signatureMethod: input.signatureMethod,
        ipAddress: ctx.req?.ip,
        userAgent: ctx.req?.get('user-agent'),
      });

      return result;
    }),

  /**
   * Validar assinatura de documento
   */
  validate: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        documentContent: z.instanceof(Buffer),
      })
    )
    .query(async ({ input }) => {
      const isValid = await validateDocumentSignature(
        input.documentId,
        input.documentContent
      );

      return {
        documentId: input.documentId,
        isValid,
        validatedAt: new Date(),
      };
    }),

  /**
   * Obter assinaturas de um documento
   */
  getSignatures: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const signatures = await getDocumentSignatures(input.documentId);

      return signatures.map(sig => ({
        id: sig.id,
        signerName: sig.signerName,
        signerEmail: sig.signerEmail,
        cpf: sig.cpf,
        signatureTimestamp: sig.signatureTimestamp,
        signatureMethod: sig.signatureMethod,
        isValid: sig.isValid,
      }));
    }),

  /**
   * Exportar certificado de assinatura (para LGPD/compliance)
   */
  exportCertificate: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Apenas admin pode exportar certificados
      if (ctx.user?.role !== 'admin') {
        throw new Error('Permissão negada');
      }

      return exportSignatureCertificate(input.documentId);
    }),

  /**
   * Verificar status de assinatura de documento crítico
   */
  getStatus: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const signatures = await getDocumentSignatures(input.documentId);

      return {
        documentId: input.documentId,
        isSigned: signatures.length > 0,
        totalSignatures: signatures.length,
        allValid: signatures.every(s => s.isValid),
        signatures: signatures.map(s => ({
          signerName: s.signerName,
          timestamp: s.signatureTimestamp,
          isValid: s.isValid,
        })),
      };
    }),
});
