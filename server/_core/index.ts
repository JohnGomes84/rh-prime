import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import "./load-env";
import { registerOAuthRoutes } from "./oauth";
import { registerExportRoutes } from "../routers/exportRoutes";
import { registerDocumentUploadRoutes } from "../routers/documentUploadRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { setupSSE } from "./sse";
import { runSeeds } from "../lib/seed";
import { serveStatic, setupVite } from "./vite";
import {
  createRateLimitMiddleware,
  healthHandler,
  installGlobalErrorHandlers,
  logError,
  metricsHandler,
  readinessHandler,
  requestLogger,
  withCorrelationId,
} from "./observability";

installGlobalErrorHandlers();

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
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function listenWithPortRetry(
  server: ReturnType<typeof createServer>,
  preferredPort: number,
  host: string
): Promise<number> {
  let port = await findAvailablePort(preferredPort);

  while (true) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: NodeJS.ErrnoException) => {
          server.off("listening", onListening);
          reject(error);
        };

        const onListening = () => {
          server.off("error", onError);
          resolve();
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, host);
      });

      return port;
    } catch (error) {
      const listenError = error as NodeJS.ErrnoException;
      if (listenError.code !== "EADDRINUSE") {
        throw listenError;
      }

      port += 1;
      if (port >= preferredPort + 20) {
        throw new Error(`No available port found starting from ${preferredPort}`);
      }
    }
  }
}

async function startServer() {
  // Executar seeds de configuração
  await runSeeds();
  
  const app = express();
  const server = createServer(app);
  const rateLimit = createRateLimitMiddleware();
  app.set("trust proxy", 1);
  app.use(withCorrelationId);
  app.use(requestLogger);
  app.get("/health", healthHandler);
  app.get("/ready", readinessHandler);
  app.get("/metrics", metricsHandler);
  app.use("/api", rateLimit);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Export routes (Excel/PDF) under /api/reports/*
  registerExportRoutes(app);
  registerDocumentUploadRoutes(app);
  // SSE notifications under /api/notifications/stream
  setupSSE(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const host = process.env.SERVER_HOST || "0.0.0.0";
  const port = await listenWithPortRetry(server, preferredPort, host);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    (host === "0.0.0.0" || host === "::" ? `http://localhost:${port}` : `http://${host}:${port}`);
  console.log(`Server running on ${baseUrl}/`);
}

startServer().catch(error => {
  logError("server.startupFailed", {
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { message: String(error) },
  });
  process.exitCode = 1;
});
