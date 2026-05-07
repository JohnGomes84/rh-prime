import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setupWebSocket } from "./websocket";
import { ENV } from "./env";
import { startNotificationScheduler } from "./notification-scheduler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.set("trust proxy", 1);

  setupWebSocket(server);

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

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[Express] Unhandled error:", err);
    res.status(err.status ?? 500).json({
      error: ENV.isProduction ? "Internal server error" : err.message,
    });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket available at ws://localhost:${port}/api/ws`);
    if (!ENV.isTest) startNotificationScheduler();
  });
}

startServer().catch(console.error);
