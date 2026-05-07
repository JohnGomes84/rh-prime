import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { parseResumePdf, generateJobDescription } from "../integrations/ai-recruitment";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

export const aiRouter = router({
  parseResume: protectedProcedure
    .input(
      z.object({
        pdfBase64: z.string().min(100),
      })
    )
    .mutation(async ({ input }) => {
      const cleaned = input.pdfBase64.replace(/^data:[^,]+,/, "");
      const approxBytes = (cleaned.length * 3) / 4;
      if (approxBytes > MAX_PDF_BYTES) {
        throw new Error("PDF excede 8MB");
      }
      const dataUrl = `data:application/pdf;base64,${cleaned}`;
      return parseResumePdf(dataUrl);
    }),

  generateJobDescription: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2).max(120),
        level: z
          .enum(["Júnior", "Pleno", "Sênior", "Especialista", "Coordenação", "Gerência"])
          .optional(),
        department: z.string().max(80).optional(),
        requirements: z.string().max(2000).optional(),
        responsibilities: z.string().max(2000).optional(),
        benefits: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const description = await generateJobDescription(input);
      return { description };
    }),
});
