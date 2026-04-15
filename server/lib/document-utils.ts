import path from "node:path";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { documents } from "../../drizzle/schema";

export const DOCUMENT_ALLOWED_FILE_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

export const DOCUMENT_MAX_FILE_SIZE = 25 * 1024 * 1024;
export const DOCUMENT_MAX_TAGS = 20;
export const DOCUMENT_MAX_TAG_LENGTH = 50;

export type FileInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
};

export function parseTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeTags(input: string[] | undefined): string[] {
  if (!input?.length) return [];

  return Array.from(
    new Set(
      input
        .map(tag => tag.trim().toLowerCase().replace(/\s+/g, " "))
        .filter(tag => tag.length > 0 && tag.length <= DOCUMENT_MAX_TAG_LENGTH)
    )
  ).slice(0, DOCUMENT_MAX_TAGS);
}

export function validateFile(file: FileInput) {
  if (!file.buffer.length || file.size === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Arquivo vazio.",
    });
  }

  if (file.size > DOCUMENT_MAX_FILE_SIZE) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Arquivo excede o tamanho máximo permitido.",
    });
  }

  const allowedExtensions = DOCUMENT_ALLOWED_FILE_TYPES[file.mimeType];
  if (!allowedExtensions) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tipo de arquivo não permitido.",
    });
  }

  const extension = path.extname(file.originalName).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Extensão do arquivo não corresponde ao tipo informado.",
    });
  }
}

export async function lockDocumentForVersioning(tx: any, documentId: string) {
  const rows = await tx
    .select({
      id: documents.id,
      status: documents.status,
      latestVersionNumber: documents.latestVersionNumber,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .for("update")
    .execute();

  return rows[0] ?? null;
}
