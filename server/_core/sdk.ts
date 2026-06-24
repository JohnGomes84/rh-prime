import { COOKIE_NAME } from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema.js";
import * as db from "../db.js";
import { verifyToken as verifyLocalJwt } from "../auth/jwt-service.js";

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);

    if (!sessionCookie) {
      throw ForbiddenError("No session cookie");
    }

    const payload = verifyLocalJwt(sessionCookie);
    if (!payload) {
      throw ForbiddenError("Invalid or expired session");
    }

    const user = await db.getUserById(payload.userId);
    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

export const sdk = new SDKServer();
