import { getDb } from "./db";
import * as schema from "../drizzle/schema";

export interface AuditContext {
  userId?: number;
  cpf?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra uma ação de auditoria no banco de dados
 */
export async function logAudit(
  action: "CREATE" | "READ" | "UPDATE" | "DELETE",
  resource: string,
  resourceId: number | null,
  context: AuditContext,
  changesBefore?: Record<string, any>,
  changesAfter?: Record<string, any>,
  description?: string
) {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db.insert(schema.auditLogs).values({
      userId: context.userId,
      cpf: context.cpf || "SYSTEM",
      action,
      resource,
      resourceId: resourceId || undefined,
      status: 200,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changesBefore: changesBefore ? JSON.stringify(changesBefore) : null,
      changesAfter: changesAfter ? JSON.stringify(changesAfter) : null,
      description,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[AUDIT] Erro ao registrar auditoria:", error);
  }
}

/**
 * Extrai contexto de auditoria da requisição
 */
export function extractAuditContext(req: any): AuditContext {
  return {
    userId: req.user?.id,
    cpf: req.user?.cpf,
    ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
    userAgent: req.headers["user-agent"],
  };
}

/**
 * Middleware para registrar mudanças em entidades
 */
export async function auditChange(
  action: "CREATE" | "UPDATE" | "DELETE",
  resource: string,
  resourceId: number,
  context: AuditContext,
  before?: Record<string, any>,
  after?: Record<string, any>,
  description?: string
) {
  await logAudit(action, resource, resourceId, context, before, after, description);
}
