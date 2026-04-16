import { beforeEach, describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import { getDb } from "../db";
import { exportPixHistoryExcel, exportPixHistoryPdf } from "./pix-export";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

type PixHistoryRow = {
  id: number;
  employeeName: string;
  employeeCpf: string;
  oldPixKey: string | null;
  newPixKey: string;
  status: string;
  requestedByName: string;
  requestedByUserId: number;
  createdAt: Date;
  reviewedByUserId: number | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
};

function createDbMock(rows: PixHistoryRow[], reviewers: Array<{ id: number; name: string }>) {
  return {
    select: vi.fn((shape?: unknown) => ({
      from: vi.fn(() => {
        if (shape) {
          return {
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(async () => rows),
            })),
          };
        }

        return {
          where: vi.fn(async () => reviewers),
        };
      }),
    })),
  };
}

describe("pix-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates an Excel file with PIX history rows", async () => {
    const rows: PixHistoryRow[] = [
      {
        id: 101,
        employeeName: "Joao Silva",
        employeeCpf: "12345678900",
        oldPixKey: "joao-antigo@pix.local",
        newPixKey: "joao-novo@pix.local",
        status: "aprovado",
        requestedByName: "Lider A",
        requestedByUserId: 11,
        createdAt: new Date("2026-04-16T10:00:00.000Z"),
        reviewedByUserId: 99,
        reviewedAt: new Date("2026-04-16T12:00:00.000Z"),
        reviewNotes: "Validado",
      },
    ];

    vi.mocked(getDb).mockResolvedValue(createDbMock(rows, [{ id: 99, name: "Admin FinHub" }]) as never);

    const buffer = await exportPixHistoryExcel();

    expect(buffer.byteLength).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as ExcelJS.Buffer);

    const worksheet = workbook.getWorksheet("Histórico PIX");
    expect(worksheet).toBeDefined();
    expect(worksheet?.getRow(1).getCell(1).value).toBe("ID");
    expect(worksheet?.getRow(2).getCell(2).value).toBe("Joao Silva");
    expect(worksheet?.getRow(2).getCell(6).value).toBe("aprovado");
    expect(worksheet?.getRow(2).getCell(9).value).toBe("Admin FinHub");
    expect(worksheet?.getRow(2).getCell(11).value).toBe("Validado");
  });

  it("generates a PDF file with PIX history content", async () => {
    const rows: PixHistoryRow[] = [
      {
        id: 202,
        employeeName: "Maria Souza",
        employeeCpf: "98765432100",
        oldPixKey: null,
        newPixKey: "maria@pix.local",
        status: "pendente",
        requestedByName: "Lider B",
        requestedByUserId: 12,
        createdAt: new Date("2026-04-16T09:00:00.000Z"),
        reviewedByUserId: null,
        reviewedAt: null,
        reviewNotes: null,
      },
    ];

    vi.mocked(getDb).mockResolvedValue(createDbMock(rows, []) as never);

    const buffer = await exportPixHistoryPdf();

    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("fails fast when the database is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);

    await expect(exportPixHistoryExcel()).rejects.toThrow("Database connection failed");
    await expect(exportPixHistoryPdf()).rejects.toThrow("Database connection failed");
  });
});
