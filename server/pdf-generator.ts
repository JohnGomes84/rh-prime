import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  AlignmentType,
  BorderStyle,
  WidthType,
} from "docx";
import { ComplianceReport } from "./compliance";

export async function generateCompliancePDF(
  report: ComplianceReport
): Promise<Buffer> {
  const sections = [];

  // Header
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "RELATÓRIO DE CONFORMIDADE",
          bold: true,
          size: 56,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  sections.push(
    new Paragraph({
      text: `Empresa: ${report.companyName}`,
      spacing: { after: 50 },
    })
  );

  sections.push(
    new Paragraph({
      text: `Data de Geração: ${report.generatedAt.toLocaleDateString("pt-BR")}`,
      spacing: { after: 200 },
    })
  );

  // Summary
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "RESUMO EXECUTIVO",
          bold: true,
          size: 28,
        }),
      ],
      spacing: { before: 100, after: 100 },
    })
  );

  const summaryColor = report.summary.allCompliant ? "00B050" : "FF0000";
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: report.summary.allCompliant
            ? "✓ CONFORMIDADE TOTAL"
            : "✗ NÃO CONFORME",
          bold: true,
          size: 48,
          color: summaryColor,
        }),
      ],
      spacing: { after: 100 },
    })
  );

  sections.push(
    new Paragraph({
      text: `Total de Funcionários: ${report.totalEmployees}`,
      spacing: { after: 50 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Questões Críticas: ${report.summary.criticalIssues}`,
          color: report.summary.criticalIssues > 0 ? "FF0000" : "000000",
        }),
      ],
      spacing: { after: 50 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Questões de Alerta (30 dias): ${report.summary.warningIssues}`,
          color: report.summary.warningIssues > 0 ? "FFC000" : "000000",
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // PGR Status
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "PROGRAMA DE GESTÃO DE RISCOS (PGR)",
          bold: true,
          size: 28,
        }),
      ],
      spacing: { before: 100, after: 100 },
    })
  );

  sections.push(
    createStatusTable([
      { label: "Válidos", value: report.pgrStatus.valid },
      { label: "Vencidos", value: report.pgrStatus.expired },
      { label: "Vencendo em 30 dias", value: report.pgrStatus.expiringIn30Days },
    ])
  );

  if (report.pgrStatus.documents.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Detalhes dos Documentos:",
            bold: true,
          }),
        ],
        spacing: { before: 100, after: 50 },
      })
    );

    sections.push(
      createDocumentTable(
        report.pgrStatus.documents.map((d) => ({
          id: d.id.toString(),
          name: d.companyName,
          expiryDate: d.expiryDate,
          status: d.status,
          days: d.daysUntilExpiry.toString(),
        }))
      )
    );
  }

  sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));

  // PCMSO Status
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL (PCMSO)",
          bold: true,
          size: 28,
        }),
      ],
      spacing: { before: 100, after: 100 },
    })
  );

  sections.push(
    createStatusTable([
      { label: "Válidos", value: report.pcmsoStatus.valid },
      { label: "Vencidos", value: report.pcmsoStatus.expired },
      {
        label: "Vencendo em 30 dias",
        value: report.pcmsoStatus.expiringIn30Days,
      },
    ])
  );

  if (report.pcmsoStatus.documents.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Detalhes dos Documentos:",
            bold: true,
          }),
        ],
        spacing: { before: 100, after: 50 },
      })
    );

    sections.push(
      createDocumentTable(
        report.pcmsoStatus.documents.map((d) => ({
          id: d.id.toString(),
          name: d.companyName,
          expiryDate: d.expiryDate,
          status: d.status,
          days: d.daysUntilExpiry.toString(),
        }))
      )
    );
  }

  sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));

  // ASO Status
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "ATESTADO DE SAÚDE OCUPACIONAL (ASO)",
          bold: true,
          size: 28,
        }),
      ],
      spacing: { before: 100, after: 100 },
    })
  );

  sections.push(
    createStatusTable([
      { label: "Válidos", value: report.asoStatus.valid },
      { label: "Vencidos", value: report.asoStatus.expired },
      {
        label: "Funcionários com ASO vencendo",
        value: report.asoStatus.expiringEmployees.length,
      },
    ])
  );

  if (report.asoStatus.expiringEmployees.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Funcionários com ASO vencendo em 30 dias:",
            bold: true,
          }),
        ],
        spacing: { before: 100, after: 50 },
      })
    );

    sections.push(
      createEmployeeTable(
        report.asoStatus.expiringEmployees.map((e) => ({
          name: e.employeeName,
          type: e.examType,
          expiryDate: e.expiryDate,
          days: e.daysUntilExpiry.toString(),
        }))
      )
    );
  }

  sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));

  // Training Status
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "TREINAMENTOS",
          bold: true,
          size: 28,
        }),
      ],
      spacing: { before: 100, after: 100 },
    })
  );

  sections.push(
    createStatusTable([
      { label: "Válidos", value: report.trainingStatus.valid },
      { label: "Vencidos", value: report.trainingStatus.expired },
      {
        label: "Funcionários com treinamento vencendo",
        value: report.trainingStatus.expiringEmployees.length,
      },
    ])
  );

  if (report.trainingStatus.expiringEmployees.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Funcionários com treinamento vencendo em 30 dias:",
            bold: true,
          }),
        ],
        spacing: { before: 100, after: 50 },
      })
    );

    sections.push(
      createEmployeeTable(
        report.trainingStatus.expiringEmployees.map((e) => ({
          name: e.employeeName,
          type: e.trainingName,
          expiryDate: e.expiryDate,
          days: e.daysUntilExpiry.toString(),
        }))
      )
    );
  }

  // Footer
  sections.push(
    new Paragraph({
      text: "",
      spacing: { before: 300 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Este relatório foi gerado automaticamente pelo sistema RH Prime.",
          italics: true,
          size: 36,
        }),
      ],
      spacing: { before: 100 },
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

function createStatusTable(
  items: Array<{ label: string; value: number }>
): Table {
  const rows = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Métrica", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Quantidade", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
      ],
    }),
    ...items.map(
      (item) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(item.label)],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: item.value.toString(),
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        })
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "000000",
      },
      insideVertical: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "000000",
      },
    },
  });
}

function createDocumentTable(
  documents: Array<{
    id: string;
    name: string;
    expiryDate: string;
    status: string;
    days: string;
  }>
): Table {
  const rows = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "ID", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Empresa/Nome", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Vencimento", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Status", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Dias", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
      ],
    }),
    ...documents.map(
      (doc) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(doc.id)],
            }),
            new TableCell({
              children: [new Paragraph(doc.name)],
            }),
            new TableCell({
              children: [new Paragraph(doc.expiryDate)],
            }),
            new TableCell({
              children: [new Paragraph(doc.status)],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: doc.days,
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        })
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "000000",
      },
      insideVertical: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "000000",
      },
    },
  });
}

function createEmployeeTable(
  employees: Array<{
    name: string;
    type: string;
    expiryDate: string;
    days: string;
  }>
): Table {
  const rows = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Funcionário", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Tipo", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Vencimento", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Dias", bold: true })],
            }),
          ],
          shading: { fill: "D3D3D3" },
        }),
      ],
    }),
    ...employees.map(
      (emp) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(emp.name)],
            }),
            new TableCell({
              children: [new Paragraph(emp.type)],
            }),
            new TableCell({
              children: [new Paragraph(emp.expiryDate)],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: emp.days,
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        })
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "000000",
      },
      insideVertical: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "000000",
      },
    },
  });
}
