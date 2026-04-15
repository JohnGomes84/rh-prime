import { Workbook } from "exceljs";
import PDFDocument from "pdfkit";

export async function exportReportToExcel(report: Record<string, any>) {
  const workbook = new Workbook();

  // Resumo Executivo
  if (report.executiveSummary) {
    const ws = workbook.addWorksheet("Resumo Executivo");
    ws.columns = [
      { header: "Métrica", key: "metric", width: 30 },
      { header: "Valor", key: "value", width: 20 },
    ];

    const summary = report.executiveSummary;
    ws.addRows([
      { metric: "Receita Total", value: `R$ ${summary.totalReceive}` },
      { metric: "Custos Totais", value: `R$ ${summary.totalPay}` },
      { metric: "Margem", value: `R$ ${summary.margin}` },
      { metric: "Margem %", value: `${summary.marginPercent}%` },
      { metric: "Planejamentos", value: summary.scheduleCount },
      { metric: "Alocações", value: summary.allocationCount },
    ]);
  }

  // Planejamentos Realizados
  if (report.schedulesRealized) {
    const ws = workbook.addWorksheet("Planejamentos");
    ws.columns = [
      { header: "Data", key: "date", width: 15 },
      { header: "Cliente ID", key: "clientId", width: 12 },
      { header: "Turno ID", key: "shiftId", width: 12 },
      { header: "Diaristas", key: "allocations", width: 12 },
      { header: "Total a Pagar", key: "totalPay", width: 15 },
      { header: "Total a Receber", key: "totalReceive", width: 15 },
    ];

    report.schedulesRealized.forEach((schedule: any) => {
      ws.addRow({
        date: new Date(schedule.date).toLocaleDateString("pt-BR"),
        clientId: schedule.clientId,
        shiftId: schedule.shiftId,
        allocations: schedule.allocations,
        totalPay: `R$ ${schedule.totalPay}`,
        totalReceive: `R$ ${schedule.totalReceive}`,
      });
    });
  }

  // Pagamentos de Diaristas
  if (report.employeePayments) {
    const ws = workbook.addWorksheet("Pagamentos");
    ws.columns = [
      { header: "Nome", key: "name", width: 30 },
      { header: "CPF", key: "cpf", width: 15 },
      { header: "Dias Trabalhados", key: "daysWorked", width: 15 },
      { header: "Total Recebido", key: "totalReceived", width: 15 },
    ];

    report.employeePayments.forEach((emp: any) => {
      ws.addRow({
        name: emp.name,
        cpf: emp.cpf,
        daysWorked: emp.daysWorked,
        totalReceived: `R$ ${emp.totalReceived}`,
      });
    });
  }

  return await workbook.xlsx.writeBuffer();
}

export async function exportReportToPdf(report: Record<string, any>) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Cabeçalho
    doc.fontSize(18).font("Helvetica-Bold").text("ML SERVIÇOS", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("Relatório de Operações", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { align: "center" });
    doc.moveDown(1);

    // Resumo Executivo
    if (report.executiveSummary) {
      doc.fontSize(12).font("Helvetica-Bold").text("Resumo Executivo");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");

      const summary = report.executiveSummary;
      const summaryData = [
        ["Receita Total", `R$ ${summary.totalReceive}`],
        ["Custos Totais", `R$ ${summary.totalPay}`],
        ["Margem", `R$ ${summary.margin}`],
        ["Margem %", `${summary.marginPercent}%`],
      ];

      summaryData.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`);
      });
      doc.moveDown(0.5);
    }

    // Pagamentos de Diaristas
    if (report.employeePayments && report.employeePayments.length > 0) {
      doc.fontSize(12).font("Helvetica-Bold").text("Pagamentos de Diaristas");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica");

      const tableData = report.employeePayments.map((emp: any) => [
        emp.name,
        emp.cpf,
        emp.daysWorked.toString(),
        `R$ ${emp.totalReceived}`,
      ]);

      const headers = ["Nome", "CPF", "Dias", "Total"];
      const colWidths = [150, 100, 80, 100];

      let y = doc.y;
      headers.forEach((header, i) => {
        doc.text(header, 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
          width: colWidths[i],
          align: "left",
        });
      });

      y += 20;
      doc.moveTo(40, y).lineTo(500, y).stroke();
      y += 10;

      tableData.forEach((row: string[]) => {
        row.forEach((cell, i) => {
          doc.text(cell, 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
            width: colWidths[i],
            align: i === 0 ? "left" : "center",
          });
        });
        y += 15;
      });
    }

    doc.end();
  });
}
