import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { registerExportRoutes } from "./exportRoutes";
import { sdk } from "../_core/sdk";
import { checkPermission } from "../controle/permissionControl";
import { exportPixHistoryExcel, exportPixHistoryPdf } from "../lib/pix-export";

vi.mock("../_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

vi.mock("../controle/permissionControl", () => ({
  checkPermission: vi.fn(),
}));

vi.mock("../lib/pix-export", () => ({
  exportPixHistoryExcel: vi.fn(),
  exportPixHistoryPdf: vi.fn(),
}));

type RouteHandler = (req: Request, res: Response) => Promise<unknown> | unknown;

function createMockResponse() {
  const res = {
    setHeader: vi.fn(),
    send: vi.fn(),
    json: vi.fn(),
    status: vi.fn(),
  } as unknown as Response & {
    setHeader: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };

  res.status.mockReturnValue(res);
  return res;
}

describe("registerExportRoutes PIX history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getRegisteredRoutes() {
    const routes = new Map<string, RouteHandler>();
    const app = {
      get: vi.fn((path: string, handler: RouteHandler) => {
        routes.set(path, handler);
      }),
    };

    registerExportRoutes(app as never);
    return routes;
  }

  it("exports PIX history as Excel with attachment headers", async () => {
    const routes = getRegisteredRoutes();
    const handler = routes.get("/api/export/pix-history/excel");
    const req = {} as Request;
    const res = createMockResponse();
    const payload = Buffer.from("excel-bytes");

    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ id: 7 } as never);
    vi.mocked(checkPermission).mockResolvedValue(true as never);
    vi.mocked(exportPixHistoryExcel).mockResolvedValue(payload as never);

    await handler?.(req, res);

    expect(exportPixHistoryExcel).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining('attachment; filename="historico-pix-')
    );
    expect(res.send).toHaveBeenCalledWith(payload);
  });

  it("exports PIX history as PDF with attachment headers", async () => {
    const routes = getRegisteredRoutes();
    const handler = routes.get("/api/export/pix-history/pdf");
    const req = {} as Request;
    const res = createMockResponse();
    const payload = Buffer.from("%PDF-test");

    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ id: 7 } as never);
    vi.mocked(checkPermission).mockResolvedValue(true as never);
    vi.mocked(exportPixHistoryPdf).mockResolvedValue(payload as never);

    await handler?.(req, res);

    expect(exportPixHistoryPdf).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining('attachment; filename="historico-pix-')
    );
    expect(res.send).toHaveBeenCalledWith(payload);
  });

  it("returns 403 when the user lacks permission for PIX history export", async () => {
    const routes = getRegisteredRoutes();
    const handler = routes.get("/api/export/pix-history/excel");
    const req = {} as Request;
    const res = createMockResponse();

    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ id: 7 } as never);
    vi.mocked(checkPermission).mockResolvedValue(false as never);

    await handler?.(req, res);

    expect(exportPixHistoryExcel).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Sem permissão" });
  });
});
