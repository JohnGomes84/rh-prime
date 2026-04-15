import { describe, expect, it, vi } from "vitest";
import {
  createRateLimitMiddleware,
  getCorrelationId,
  healthHandler,
  logError,
  metricsHandler,
  readinessHandler,
} from "./_core/observability";

describe("observability - fase 3", () => {
  it("reaproveita correlation id recebido no header", () => {
    const id = getCorrelationId({
      headers: { "x-correlation-id": "abc-123" },
    } as any);
    expect(id).toBe("abc-123");
  });

  it("gera correlation id quando header não existe", () => {
    const id = getCorrelationId({ headers: {} } as any);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(8);
  });

  it("bloqueia excesso de requisições com 429", () => {
    const mw = createRateLimitMiddleware(2, 60_000);
    const req = { ip: "127.0.0.1" } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    mw(req, res, next);
    mw(req, res, next);
    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("health e readiness respondem 200", () => {
    const healthRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    healthHandler({} as any, healthRes);
    expect(healthRes.status).toHaveBeenCalledWith(200);

    const readyRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    readinessHandler({} as any, readyRes);
    expect(readyRes.status).toHaveBeenCalledWith(200);
  });

  it("metrics responde 200", () => {
    const metricsRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    metricsHandler({} as any, metricsRes);
    expect(metricsRes.status).toHaveBeenCalledWith(200);
  });

  it("logError emite payload estruturado", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError("process.uncaughtException", {
      error: { message: "boom" },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toContain('"level":"error"');
    expect(spy.mock.calls[0]?.[0]).toContain('"event":"process.uncaughtException"');

    spy.mockRestore();
  });
});
