/**
 * Router de Holerite (Payslip) - Geração de PDF
 * Usa jsPDF para gerar PDF completo com dados do funcionário e cálculos CLT 2026
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { calculatePayroll } from "../modules/payroll/payroll-calculator";
import { jsPDF } from "jspdf";

export const payslipRouter = router({
  /**
   * Gera PDF do holerite para um funcionário em um mês/ano específico
   * Retorna base64 do PDF para download no frontend
   */
  generatePdf: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      month: z.number().min(1).max(12),
      year: z.number().min(2020).max(2030),
      companyName: z.string().optional().default("RH Prime Ltda"),
      companyCnpj: z.string().optional().default("00.000.000/0001-00"),
    }))
    .mutation(async ({ input }) => {
      const employee = await db.getEmployee(input.employeeId);
      if (!employee) throw new Error("Funcionário não encontrado");

      // Buscar cargo/posição atual (mais recente)
      const positions = await db.listEmployeePositions(input.employeeId);
      const currentPosition = positions?.[0];
      const salary = currentPosition ? Number(currentPosition.salary) : 0;

      // Buscar nome do cargo
      let positionTitle = "---";
      let department = "---";
      if (currentPosition) {
        try {
          const pos = await db.getPosition(currentPosition.positionId);
          if (pos) {
            positionTitle = pos.title;
            department = pos.department || "---";
          }
        } catch (e) { /* ignore */ }
      }

      // Calcular folha
      const payroll = calculatePayroll({
        baseSalary: salary,
        allowances: 0,
        bonuses: 0,
        otherDeductions: 0,
        dependents: 0,
      });

      // Gerar PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // --- CABEÇALHO ---
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(input.companyName, margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`CNPJ: ${input.companyCnpj}`, margin, y);
      y += 10;

      // Título
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      const monthNames = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      doc.text(`RECIBO DE PAGAMENTO - ${monthNames[input.month - 1]}/${input.year}`, margin, y);
      y += 10;

      // Linha separadora
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // --- DADOS DO FUNCIONÁRIO ---
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DADOS DO FUNCIONARIO", margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const empData = [
        [`Nome: ${employee.fullName}`, `CPF: ${employee.cpf || "---"}`],
        [`Cargo: ${positionTitle}`, `Depto: ${department}`],
        [`Admissao: ---`, `Matricula: ${employee.id}`],
      ];
      for (const row of empData) {
        doc.text(row[0], margin, y);
        doc.text(row[1], pageWidth / 2, y);
        y += 5;
      }
      y += 5;

      // Linha separadora
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // --- TABELA DE PROVENTOS E DESCONTOS ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DESCRICAO", margin, y);
      doc.text("PROVENTOS", pageWidth - 80, y);
      doc.text("DESCONTOS", pageWidth - 40, y);
      y += 3;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const formatBRL = (v: number) => v.toFixed(2).replace(".", ",");

      // Proventos
      const proventos = [
        { desc: "Salario Base", valor: payroll.baseSalary },
      ];
      if (payroll.allowances > 0) proventos.push({ desc: "Gratificacoes", valor: payroll.allowances });
      if (payroll.bonuses > 0) proventos.push({ desc: "Bonus", valor: payroll.bonuses });
      if (payroll.overtimeValue > 0) proventos.push({ desc: "Horas Extras", valor: payroll.overtimeValue });

      for (const p of proventos) {
        doc.text(p.desc, margin, y);
        doc.text(formatBRL(p.valor), pageWidth - 80, y, { align: "left" });
        doc.text("---", pageWidth - 40, y, { align: "left" });
        y += 5;
      }

      // Descontos
      const descontos = [
        { desc: "INSS", valor: payroll.inss },
        { desc: "IRRF", valor: payroll.ir },
      ];
      if (payroll.otherDeductions > 0) descontos.push({ desc: "Outros Descontos", valor: payroll.otherDeductions });

      for (const d of descontos) {
        doc.text(d.desc, margin, y);
        doc.text("---", pageWidth - 80, y, { align: "left" });
        doc.text(formatBRL(d.valor), pageWidth - 40, y, { align: "left" });
        y += 5;
      }

      y += 3;
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // --- TOTAIS ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const totalProventos = proventos.reduce((s, p) => s + p.valor, 0);
      const totalDescontos = descontos.reduce((s, d) => s + d.valor, 0);

      doc.text("TOTAL PROVENTOS:", margin, y);
      doc.text(`R$ ${formatBRL(totalProventos)}`, pageWidth - 80, y);
      y += 6;
      doc.text("TOTAL DESCONTOS:", margin, y);
      doc.text(`R$ ${formatBRL(totalDescontos)}`, pageWidth - 80, y);
      y += 6;

      doc.setFontSize(12);
      doc.text("SALARIO LIQUIDO:", margin, y);
      doc.text(`R$ ${formatBRL(payroll.netSalary)}`, pageWidth - 80, y);
      y += 10;

      // --- FGTS (informativo) ---
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`FGTS do mes (8%): R$ ${formatBRL(payroll.fgts)}`, margin, y);
      y += 5;
      doc.text(`Base FGTS: R$ ${formatBRL(payroll.grossSalary)}`, margin, y);
      y += 12;

      // --- RODAPÉ ---
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      doc.setFontSize(8);
      doc.text("Declaro ter recebido a importancia liquida discriminada neste recibo.", margin, y);
      y += 10;
      doc.text("_____________________________________________", margin, y);
      y += 5;
      doc.text(`${employee.fullName}`, margin, y);
      y += 5;
      doc.text(`Data: ___/___/______`, margin, y);

      // Converter para base64
      const pdfBase64 = doc.output("datauristring");

      return {
        pdf: pdfBase64,
        filename: `holerite_${employee.fullName.replace(/\s+/g, "_")}_${input.month}_${input.year}.pdf`,
        employee: employee.fullName,
        month: input.month,
        year: input.year,
        netSalary: payroll.netSalary,
      };
    }),

  /**
   * Calcula holerite sem gerar PDF (para visualização na tela)
   */
  calculate: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
    }))
    .query(async ({ input }) => {
      const employee = await db.getEmployee(input.employeeId);
      if (!employee) throw new Error("Funcionário não encontrado");

      // Buscar posição atual
      const positions = await db.listEmployeePositions(input.employeeId);
      const currentPosition = positions?.[0];
      const salary = currentPosition ? Number(currentPosition.salary) : 0;

      // Buscar nome do cargo
      let positionTitle = "---";
      let department = "---";
      if (currentPosition) {
        try {
          const pos = await db.getPosition(currentPosition.positionId);
          if (pos) {
            positionTitle = pos.title;
            department = pos.department || "---";
          }
        } catch (e) { /* ignore */ }
      }

      const payroll = calculatePayroll({
        baseSalary: salary,
        allowances: 0,
        bonuses: 0,
        otherDeductions: 0,
        dependents: 0,
      });

      return {
        employee: {
          id: employee.id,
          name: employee.fullName,
          cpf: employee.cpf,
          department,
          position: positionTitle,
        },
        payroll,
      };
    }),
});
