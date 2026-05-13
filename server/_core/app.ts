import express, { type Express } from "express";
import type { Server } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { serveStatic } from "./static.js";
import { setupWebSocket } from "./websocket.js";
import { ENV } from "./env.js";

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
