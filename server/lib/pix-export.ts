import { getDb } from "../db";
import { pixChangeRequests, employees, users } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export async function exportPixHistoryExcel() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const requests = await db
    .select({
      id: pixChangeRequests.id,
      employeeName: employees.name,
      employeeCpf: employees.cpf,
      oldPixKey: pixChangeRequests.oldPixKey,
      newPixKey: pixChangeRequests.newPixKey,
      status: pixChangeRequests.status,
      requestedByName: users.name,
      requestedByUserId: pixChangeRequests.requestedByUserId,
      createdAt: pixChangeRequests.createdAt,
      reviewedByUserId: pixChangeRequests.reviewedByUserId,
      reviewedAt: pixChangeRequests.updatedAt,
      reviewNotes: pixChangeRequests.reviewNotes,
    })
    .from(pixChangeRequests)
    .leftJoin(employees, eq(pixChangeRequests.employeeId, employees.id))
    .leftJoin(users, eq(pixChangeRequests.requestedByUserId, users.id));

  // Buscar nomes dos revisores
  const reviewerIds = Array.from(new Set(requests.map((r: any) => r.reviewedByUserId).filter(Boolean)));
  const reviewers: Record<number, string> = {};
  if (reviewerIds.length > 0) {
    const reviewerUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, reviewerIds as number[]));
    reviewerUsers.forEach((u: any) => {
      reviewers[u.id] = u.name;
    });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Histórico PIX");

  worksheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Funcionário", key: "employeeName", width: 20 },
    { header: "CPF", key: "employeeCpf", width: 15 },
    { header: "Chave Atual", key: "oldPixKey", width: 25 },
    { header: "Nova Chave", key: "newPixKey", width: 25 },
    { header: "Status", key: "status", width: 12 },
    { header: "Solicitado Por", key: "requestedByName", width: 15 },
    { header: "Data Solicitação", key: "createdAt", width: 18 },
    { header: "Aprovado/Rejeitado Por", key: "reviewedByName", width: 20 },
    { header: "Data Revisão", key: "reviewedAt", width: 18 },
    { header: "Motivo/Observações", key: "reviewNotes", width: 30 },
  ];

  requests.forEach((req: any) => {
    worksheet.addRow({
      id: req.id,
      employeeName: req.employeeName,
      employeeCpf: req.employeeCpf,
      oldPixKey: req.oldPixKey || "—",
      newPixKey: req.newPixKey,
      status: req.status,
      requestedByName: req.requestedByName,
      createdAt: req.createdAt ? new Date(req.createdAt).toLocaleDateString("pt-BR") : "—",
      reviewedByName: req.reviewedByUserId ? reviewers[req.reviewedByUserId] || "—" : "—",
      reviewedAt: req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString("pt-BR") : "—",
      reviewNotes: req.reviewNotes || "—",
    });
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };

  return await workbook.xlsx.writeBuffer();
}

export async function exportPixHistoryPdf() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const requests = await db
    .select({
      id: pixChangeRequests.id,
      employeeName: employees.name,
      employeeCpf: employees.cpf,
      oldPixKey: pixChangeRequests.oldPixKey,
      newPixKey: pixChangeRequests.newPixKey,
      status: pixChangeRequests.status,
      requestedByName: users.name,
      requestedByUserId: pixChangeRequests.requestedByUserId,
      createdAt: pixChangeRequests.createdAt,
      reviewedByUserId: pixChangeRequests.reviewedByUserId,
      reviewedAt: pixChangeRequests.updatedAt,
      reviewNotes: pixChangeRequests.reviewNotes,
    })
    .from(pixChangeRequests)
    .leftJoin(employees, eq(pixChangeRequests.employeeId, employees.id))
    .leftJoin(users, eq(pixChangeRequests.requestedByUserId, users.id));

  // Buscar nomes dos revisores
  const reviewerIds = Array.from(new Set(requests.map((r: any) => r.reviewedByUserId).filter(Boolean)));
  const reviewers: Record<number, string> = {};
  if (reviewerIds.length > 0) {
    const reviewerUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, reviewerIds as number[]));
    reviewerUsers.forEach((u: any) => {
      reviewers[u.id] = u.name;
    });
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text("Histórico de Solicitações PIX", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { align: "center" });
    doc.moveDown(1);

    const tableData = requests.map((req: any) => [
      req.id.toString(),
      req.employeeName || "—",
      req.employeeCpf || "—",
      req.newPixKey,
      req.status,
      req.createdAt ? new Date(req.createdAt).toLocaleDateString("pt-BR") : "—",
    ]);

    const table = {
      headers: ["ID", "Funcionário", "CPF", "Nova Chave PIX", "Status", "Data"],
      rows: tableData,
    };

    doc.fontSize(9);
    let y = doc.y;
    const colWidths = [40, 100, 90, 120, 80, 80];
    const rowHeight = 20;

    table.headers.forEach((header, i) => {
      doc.text(header, 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
        width: colWidths[i],
        align: "left",
      });
    });

    y += rowHeight;
    doc.moveTo(40, y).lineTo(550, y).stroke();
    y += 5;

    table.rows.forEach((row) => {
      row.forEach((cell, i) => {
        doc.text(cell, 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
          width: colWidths[i],
          align: "left",
        });
      });
      y += rowHeight;
    });

    doc.end();
  });
}
