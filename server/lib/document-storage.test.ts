import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalStorageBackend } from "./document-storage";

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map(dir =>
      fsp.rm(dir, { recursive: true, force: true })
    )
  );
});

describe("LocalStorageBackend", () => {
  it("salva e remove arquivo com storageKey relativo", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "finhub-doc-storage-")
    );
    createdDirs.push(tempDir);

    const backend = new LocalStorageBackend(tempDir);
    const saved = await backend.save(Buffer.from("conteudo"), {
      documentId: "doc-1",
      versionId: "ver-1",
      originalName: "contrato final.pdf",
      mimeType: "application/pdf",
    });

    expect(saved.storageKey).toContain("documents/");
    expect(saved.storageKey).toContain("doc-1/");
    expect(saved.fileHash).toHaveLength(64);

    const stream = await backend.getStream(saved.storageKey);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", chunk => chunks.push(Buffer.from(chunk)));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    expect(Buffer.concat(chunks).toString("utf-8")).toBe("conteudo");

    await backend.delete(saved.storageKey);
    await expect(backend.getStream(saved.storageKey)).rejects.toThrow();
  });
});
