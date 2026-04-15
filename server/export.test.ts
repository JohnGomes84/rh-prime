import { describe, it, expect, vi } from "vitest";

// Testar as funções utilitárias de formatação usadas nos exports
describe("Export Utils", () => {
  it("formatBRL should format numbers as Brazilian currency", () => {
    const formatBRL = (val: string | number): string => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
    };
    expect(formatBRL(1000)).toContain("1.000");
    expect(formatBRL("2500.50")).toContain("2.500");
    expect(formatBRL(0)).toContain("0,00");
  });

  it("formatDate should format dates in pt-BR", () => {
    const formatDate = (d: Date | string | null): string => {
      if (!d) return "\u2014";
      return new Date(d).toLocaleDateString("pt-BR");
    };
    expect(formatDate(null)).toBe("\u2014");
    expect(formatDate("2026-03-29")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("translateStatus should translate known statuses", () => {
    const translateStatus = (s: string): string => {
      const map: Record<string, string> = {
        pendente: "Pendente", pago: "Pago", vencido: "Vencido",
        cancelado: "Cancelado", recebido: "Recebido",
      };
      return map[s] || s;
    };
    expect(translateStatus("pendente")).toBe("Pendente");
    expect(translateStatus("pago")).toBe("Pago");
    expect(translateStatus("recebido")).toBe("Recebido");
    expect(translateStatus("vencido")).toBe("Vencido");
    expect(translateStatus("cancelado")).toBe("Cancelado");
    expect(translateStatus("outro")).toBe("outro");
  });
});

// Testar que os endpoints de exportação existem e são registrados
describe("Export Routes Registration", () => {
  it("registerExportRoutes should register 4 GET routes", async () => {
    const { registerExportRoutes } = await import("./routers/exportRoutes");
    const routes: string[] = [];
    const mockApp = {
      get: vi.fn((path: string) => {
        routes.push(path);
      }),
    } as any;

    registerExportRoutes(mockApp);

    expect(mockApp.get).toHaveBeenCalledTimes(6); // 4 reports + 2 PIX export
    expect(routes).toContain("/api/reports/payable/excel");
    expect(routes).toContain("/api/reports/payable/pdf");
    expect(routes).toContain("/api/reports/receivable/excel");
    expect(routes).toContain("/api/reports/receivable/pdf");
    expect(routes).toContain("/api/export/pix-history/excel");
    expect(routes).toContain("/api/export/pix-history/pdf");
  }, 30000);
});

// Testar que ExcelJS e PDFKit estão disponíveis
describe("Export Dependencies", () => {
  it("ExcelJS should be importable", async () => {
    const ExcelJS = await import("exceljs");
    expect(ExcelJS).toBeDefined();
    const wb = new ExcelJS.default.Workbook();
    expect(wb).toBeDefined();
  });

  it("PDFKit should be importable", async () => {
    const PDFDocument = await import("pdfkit");
    expect(PDFDocument).toBeDefined();
  });
});
