import { describe, expect, it } from "vitest";

import { detectCsvDelimiter, parseScheduleCsv } from "./schedule-csv";

describe("schedule-csv", () => {
  it("detects semicolon-delimited csv", () => {
    expect(detectCsvDelimiter("data;cliente;turno\n2026-04-10;Aurora;MLT-1")).toBe(";");
  });

  it("parses normalized schedule rows", () => {
    const rows = parseScheduleCsv(
      "data,cliente,turno,unidade,lider,observacoes\n2026-04-10,Logistica Aurora,MLT-1,Base Sul,Carlos Lima,Operacao especial"
    );

    expect(rows).toEqual([
      {
        date: "2026-04-10",
        client: "Logistica Aurora",
        shift: "MLT-1",
        unit: "Base Sul",
        leader: "Carlos Lima",
        notes: "Operacao especial",
      },
    ]);
  });

  it("throws on missing required columns", () => {
    expect(() => parseScheduleCsv("data,turno\n2026-04-10,MLT-1")).toThrow(/campos obrigatorios/i);
  });
});
