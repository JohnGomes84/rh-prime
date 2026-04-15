import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { z } from "zod";
import { sdk } from "../_core/sdk";
import { DocumentCommandService } from "../lib/document-command-service";
import { getStorageBackend } from "../lib/document-storage";
import { parseTags } from "../lib/document-utils";

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    role?: string;
  };
  body: Buffer | Record<string, unknown>;
};

const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(255),
  documentType: z.string().trim().min(1).max(50),
  purpose: z.string().trim().min(1).max(50),
  retentionPolicy: z.string().trim().min(1).max(30),
  visibility: z.enum(["private", "internal", "public"]).default("internal"),
  notes: z.string().max(5000).optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

const addVersionSchema = z.object({
  changeNotes: z.string().max(2000).optional(),
});

async function attachUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await sdk.authenticateRequest(req);
    req.user = {
      id: user.id,
      role: user.role,
    };
    next();
  } catch (error) {
    res.status(401).json({
      message: "Não autenticado.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function getUserContext(req: AuthenticatedRequest) {
  if (!req.user) {
    throw new Error("Authenticated user missing from request.");
  }

  return {
    userId: req.user.id,
    userRole: req.user.role,
    ipAddress: req.ip || "0.0.0.0",
    userAgent:
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : undefined,
  };
}

function extractFile(req: AuthenticatedRequest) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new Error("Nenhum arquivo enviado.");
  }

  const originalNameHeader = req.headers["x-file-name"];
  const mimeTypeHeader = req.headers["x-file-mime-type"];

  const originalName =
    typeof originalNameHeader === "string" && originalNameHeader.trim()
      ? decodeURIComponent(originalNameHeader)
      : "documento.bin";

  const mimeType =
    typeof mimeTypeHeader === "string" && mimeTypeHeader.trim()
      ? mimeTypeHeader
      : "application/octet-stream";

  return {
    buffer: req.body,
    originalName,
    mimeType,
    size: req.body.length,
  };
}

export function registerDocumentUploadRoutes(app: Express) {
  const rawUpload = express.raw({
    type: () => true,
    limit: "25mb",
  });

  app.post(
    "/api/documents/upload",
    attachUser,
    rawUpload,
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const parsed = createDocumentSchema.parse({
          title: req.query.title,
          documentType: req.query.documentType,
          purpose: req.query.purpose,
          retentionPolicy: req.query.retentionPolicy,
          visibility: req.query.visibility,
          notes: req.query.notes,
          ownerUserId: req.query.ownerUserId,
          tags: parseTags(req.query.tags),
        });

        const file = extractFile(req);
        const service = new DocumentCommandService();
        const result = await service.createDocumentWithInitialVersion(
          parsed,
          file,
          getUserContext(req)
        );

        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/documents/:documentId/versions",
    attachUser,
    rawUpload,
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const parsed = addVersionSchema.parse({
          changeNotes: req.query.changeNotes,
        });

        const file = extractFile(req);
        const service = new DocumentCommandService();
        const result = await service.addDocumentVersion(
          {
            documentId: req.params.documentId,
            changeNotes: parsed.changeNotes,
          },
          file,
          getUserContext(req)
        );

        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/documents/:documentId/download",
    attachUser,
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const service = new DocumentCommandService();
        const payload = await service.createDownloadTokenData(
          req.params.documentId,
          getUserContext(req)
        );

        const stream = await getStorageBackend(payload.storageBackend).getStream(
          payload.storageKey
        );

        res.setHeader("Content-Type", payload.mimeType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(payload.fileName)}"`
        );

        stream.on("error", next);
        stream.pipe(res);
      } catch (error) {
        next(error);
      }
    }
  );
}
