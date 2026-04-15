import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

type Bucket = { count: number; resetAt: number };
type MetricsSnapshot = {
  startedAt: string;
  requestsTotal: number;
  requestsByPath: Record<string, number>;
  errorsTotal: number;
  avgDurationMs: number;
};

const metricsState: MetricsSnapshot = {
  startedAt: new Date().toISOString(),
  requestsTotal: 0,
  requestsByPath: {},
  errorsTotal: 0,
  avgDurationMs: 0,
};

export function getCorrelationId(req: Request): string {
  const headerValue = req.headers["x-correlation-id"];
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }
  return crypto.randomUUID();
}

export function withCorrelationId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = getCorrelationId(req);
  (req as Request & { correlationId?: string }).correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}

export function logInfo(event: string, payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: "info",
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    })
  );
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

export function logError(event: string, payload: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    })
  );
}

export function installGlobalErrorHandlers() {
  process.on("uncaughtException", error => {
    logError("process.uncaughtException", {
      error: serializeError(error),
    });
  });

  process.on("unhandledRejection", reason => {
    logError("process.unhandledRejection", {
      error: serializeError(reason),
    });
  });
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  metricsState.requestsTotal += 1;
  metricsState.requestsByPath[req.path] =
    (metricsState.requestsByPath[req.path] || 0) + 1;

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const n = metricsState.requestsTotal;
    metricsState.avgDurationMs =
      n === 1
        ? duration
        : (metricsState.avgDurationMs * (n - 1) + duration) / n;
    if (res.statusCode >= 500) {
      metricsState.errorsTotal += 1;
    }
  });

  logInfo("http.request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    correlationId:
      (req as Request & { correlationId?: string }).correlationId ?? null,
  });
  next();
}

export function createRateLimitMiddleware(
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    const current = buckets.get(key);

    if (!current || now > current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > maxRequests) {
      res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Muitas requisições. Tente novamente em instantes.",
      });
      return;
    }

    next();
  };
}

export function healthHandler(_req: Request, res: Response) {
  res.status(200).json({
    status: "ok",
    service: "finhub-inteligente",
    timestamp: new Date().toISOString(),
  });
}

export function readinessHandler(_req: Request, res: Response) {
  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
}

export function metricsHandler(_req: Request, res: Response) {
  res.status(200).json(metricsState);
}
