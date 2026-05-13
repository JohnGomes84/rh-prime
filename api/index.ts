import type { Request, Response } from "express";
import { createConfiguredApp } from "../server/_core/app.js";

const appPromise = createConfiguredApp({ serveClient: false });

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  const expressHandler = app as unknown as (
    req: Request,
    res: Response
  ) => unknown;
  return expressHandler(req, res);
}
