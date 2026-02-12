import { protectedProcedure, router } from "../_core/trpc";
import { generateComplianceReport } from "../compliance";
import { generateCompliancePDF } from "../pdf-generator";
import { z } from "zod";

export const complianceRouter = router({
  generateReport: protectedProcedure
    .input(z.object({ companyName: z.string() }))
    .mutation(async ({ input: { companyName } }) => {
      try {
        const report = await generateComplianceReport(companyName);
        return {
          success: true,
          report,
        };
      } catch (error) {
        console.error("Error generating compliance report:", error);
        return {
          success: false,
          error: "Erro ao gerar relatório de conformidade",
        };
      }
    }),

  downloadPDF: protectedProcedure
    .input(z.object({ companyName: z.string() }))
    .mutation(async ({ input: { companyName } }) => {
      try {
        const report = await generateComplianceReport(companyName);
        const pdfBuffer = await generateCompliancePDF(report);

        // Return base64 encoded PDF
        return {
          success: true,
          pdf: pdfBuffer.toString("base64"),
          filename: `Relatorio_Conformidade_${new Date().toISOString().split("T")[0]}.docx`,
        };
      } catch (error) {
        console.error("Error generating PDF:", error);
        return {
          success: false,
          error: "Erro ao gerar PDF",
        };
      }
    }),
});