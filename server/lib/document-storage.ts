import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export type StorageBackendName = "local" | "s3";

export interface SaveFileInput {
  documentId: string;
  versionId: string;
  originalName: string;
  mimeType: string;
}

export interface StoredFile {
  storageKey: string;
  fileHash: string;
  mimeType: string;
  size: number;
  backend: StorageBackendName;
}

export interface StorageBackend {
  readonly name: StorageBackendName;
  save(fileBuffer: Buffer, input: SaveFileInput): Promise<StoredFile>;
  getStream(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<void>;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export class LocalStorageBackend implements StorageBackend {
  readonly name = "local" as const;
  private readonly basePath: string;

  constructor(basePath = "./storage") {
    this.basePath = path.resolve(basePath);
  }

  private sanitizeFileName(originalName: string): string {
    const baseName = path.basename(originalName.trim());
    const sanitized = baseName
      .normalize("NFKD")
      .replace(/[^\w.\-() ]+/g, "_")
      .replace(/\s+/g, " ")
      .slice(0, 180);

    return sanitized || `${randomUUID()}.bin`;
  }

  private buildStorageKey(input: SaveFileInput): string {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const safeName = this.sanitizeFileName(input.originalName);

    return path.posix.join(
      "documents",
      year,
      month,
      input.documentId,
      `${input.versionId}_${safeName}`
    );
  }

  private resolveStorageKey(storageKey: string): string {
    const normalizedKey = storageKey.replace(/\\/g, "/");
    const fullPath = path.resolve(this.basePath, normalizedKey);
    const relative = path.relative(this.basePath, fullPath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new StorageError("Invalid storage key.");
    }

    return fullPath;
  }

  async save(fileBuffer: Buffer, input: SaveFileInput): Promise<StoredFile> {
    const storageKey = this.buildStorageKey(input);
    const fullPath = this.resolveStorageKey(storageKey);

    await fsp.mkdir(path.dirname(fullPath), { recursive: true });

    const fileHash = createHash("sha256").update(fileBuffer).digest("hex");
    await fsp.writeFile(fullPath, fileBuffer, { flag: "wx" });

    return {
      storageKey,
      fileHash,
      mimeType: input.mimeType,
      size: fileBuffer.length,
      backend: this.name,
    };
  }

  async getStream(storageKey: string): Promise<Readable> {
    const fullPath = this.resolveStorageKey(storageKey);
    await fsp.access(fullPath, fs.constants.R_OK);
    return fs.createReadStream(fullPath);
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = this.resolveStorageKey(storageKey);

    try {
      await fsp.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async listKeys(prefix = "documents"): Promise<string[]> {
    const root = this.resolveStorageKey(prefix);
    const results: string[] = [];

    const walk = async (currentPath: string) => {
      const entries = await fsp.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }

        results.push(
          path.relative(this.basePath, fullPath).replace(/\\/g, "/")
        );
      }
    };

    try {
      await walk(root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return results;
  }
}

const backends = new Map<StorageBackendName, StorageBackend>();

export function getStorageBackend(
  backend?: StorageBackendName
): StorageBackend {
  const selected =
    backend ??
    ((process.env.STORAGE_BACKEND as StorageBackendName | undefined) ?? "local");

  if (backends.has(selected)) {
    return backends.get(selected)!;
  }

  if (selected === "local") {
    const instance = new LocalStorageBackend(
      process.env.STORAGE_PATH || "./storage"
    );
    backends.set(selected, instance);
    return instance;
  }

  throw new StorageError(`Unsupported storage backend: ${selected}`);
}
