import express, { type Express } from "express";
import type { Server } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { put, head } from "@vercel/blob";
import { registerOAuthRoutes } from "./oauth.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { sdk } from "./sdk.js";
import { serveStatic } from "./static.js";
import { setupWebSocket } from "./websocket.js";
import { ENV } from "./env.js";

const UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // 4MB (Vercel serverless server upload cap ~4.5MB)
const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
const ATTACHMENT_ALLOWED_TYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/csv",
  "text/plain",
]);

interface CreateAppOptions {
  server?: Server;
  serveClient?: boolean;
}

export async function createConfiguredApp(
  options: CreateAppOptions = {}
): Promise<Express> {
  const app = express();

  app.set("trust proxy", 1);

  if (options.server) {
    setupWebSocket(options.server);
  }

  app.use(
    helmet({
      contentSecurityPolicy: ENV.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'", "wss:", "https:"],
              fontSrc: ["'self'", "data:"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  if (ENV.corsOrigins.length > 0) {
    app.use(
      cors({
        origin: ENV.corsOrigins,
        credentials: true,
      })
    );
  }

  const apiLimiter = rateLimit({
    windowMs: ENV.rateLimitWindowMs,
    max: ENV.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => req.path.startsWith("/api/ws"),
  });

  const authLimiter = rateLimit({
    windowMs: ENV.rateLimitWindowMs,
    max: ENV.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", apiLimiter);
  app.use(/\/api\/trpc\/auth\.(login|register)/, authLimiter);

  app.post(
    "/api/upload-evidence",
    express.raw({ type: () => true, limit: UPLOAD_MAX_BYTES }),
    async (req, res, next) => {
      try {
        const user = await sdk.authenticateRequest(req).catch(() => null);
        if (!user) return res.status(401).json({ error: "unauthorized" });
        if (user.role !== "admin") return res.status(403).json({ error: "forbidden" });

        const contentType = String(req.headers["content-type"] ?? "application/octet-stream");
        if (!ALLOWED_UPLOAD_TYPES.has(contentType)) {
          return res.status(415).json({
            error: "unsupported content-type",
            allowed: Array.from(ALLOWED_UPLOAD_TYPES),
          });
        }

        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "empty body" });
        }
        if (req.body.length > UPLOAD_MAX_BYTES) {
          return res.status(413).json({ error: "file too large", maxBytes: UPLOAD_MAX_BYTES });
        }

        const rawName = String(req.query.filename ?? "evidence");
        const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
        const pathname = `admission/${Date.now()}-${safeName}`;

        const blob = await put(pathname, req.body, {
          access: "private",
          contentType,
          addRandomSuffix: false,
        });

        return res.json({
          url: blob.url,
          pathname: blob.pathname,
          contentType,
          size: req.body.length,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    "/api/upload-attachment",
    express.raw({ type: () => true, limit: UPLOAD_MAX_BYTES }),
    async (req, res, next) => {
      try {
        const user = await sdk.authenticateRequest(req).catch(() => null);
        if (!user) return res.status(401).json({ error: "unauthorized" });

        const contentType = String(req.headers["content-type"] ?? "application/octet-stream");
        if (!ATTACHMENT_ALLOWED_TYPES.has(contentType)) {
          return res.status(415).json({
            error: "unsupported content-type",
            allowed: Array.from(ATTACHMENT_ALLOWED_TYPES),
          });
        }

        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "empty body" });
        }
        if (req.body.length > UPLOAD_MAX_BYTES) {
          return res.status(413).json({ error: "file too large", maxBytes: UPLOAD_MAX_BYTES });
        }

        const cardIdParam = Number(req.query.cardId ?? 0);
        if (!Number.isInteger(cardIdParam) || cardIdParam <= 0) {
          return res.status(400).json({ error: "cardId param required" });
        }

        const rawName = String(req.query.filename ?? "attachment");
        const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
        const pathname = `kanban/card-${cardIdParam}/${Date.now()}-${safeName}`;

        const blob = await put(pathname, req.body, {
          access: "private",
          contentType,
          addRandomSuffix: false,
        });

        return res.json({
          url: blob.url,
          pathname: blob.pathname,
          contentType,
          size: req.body.length,
          fileName: rawName,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // Proxy: stream do blob private pra client autenticado.
  // Aceita ?url=<canonical blob url>.
  app.get("/api/blob/proxy", async (req, res, next) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "unauthorized" });

      const raw = String(req.query.url ?? "");
      if (!raw) return res.status(400).json({ error: "url required" });

      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        return res.status(400).json({ error: "invalid url" });
      }
      if (!parsed.hostname.endsWith(".blob.vercel-storage.com")) {
        return res.status(400).json({ error: "invalid host" });
      }

      // head() valida acesso + retorna metadata (incluindo downloadUrl assinado com token)
      const meta = await head(raw);
      const downloadUrl = (meta as any).downloadUrl ?? raw;

      const upstream = await fetch(downloadUrl, {
        headers: process.env.BLOB_READ_WRITE_TOKEN
          ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
          : {},
      });

      if (!upstream.ok || !upstream.body) {
        return res.status(upstream.status).json({ error: `upstream ${upstream.status}` });
      }

      res.setHeader("Content-Type", meta.contentType ?? "application/octet-stream");
      const safeName = (meta.pathname.split("/").pop() ?? "file").replace(/[^a-zA-Z0-9._-]/g, "_");
      res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
      if (meta.size) res.setHeader("Content-Length", String(meta.size));

      // Stream upstream body para resposta
      const reader = upstream.body.getReader();
      const pump = async () => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      };
      pump().catch(next);
    } catch (err) {
      next(err);
    }
  });

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC] ${path}:`, error);
        }
      },
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  if (process.env.NODE_ENV === "development" && options.server) {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, options.server);
  } else if (options.serveClient) {
    serveStatic(app);
  }

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[Express] Unhandled error:", err);
    res.status(err.status ?? 500).json({
      error: ENV.isProduction ? "Internal server error" : err.message,
    });
  });

  return app;
}
