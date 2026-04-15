import { describe, expect, it } from "vitest";
import {
  normalizeTags,
  parseTags,
  validateFile,
} from "./document-utils";

describe("document-utils", () => {
  it("normaliza, deduplica e limita tags", () => {
    const result = normalizeTags([
      " Financeiro ",
      "financeiro",
      "cliente vip",
      "cliente   vip",
    ]);

    expect(result).toEqual(["financeiro", "cliente vip"]);
  });

  it("faz parse de tags separadas por vírgula", () => {
    expect(parseTags("financeiro, contrato, urgente")).toEqual([
      "financeiro",
      "contrato",
      "urgente",
    ]);
  });

  it("rejeita extensão incompatível com mime", () => {
    expect(() =>
      validateFile({
        buffer: Buffer.from("abc"),
        originalName: "contrato.pdf",
        mimeType: "image/png",
        size: 3,
      })
    ).toThrow("Extensão do arquivo não corresponde ao tipo informado.");
  });
});
