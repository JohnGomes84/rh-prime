import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import type { RowDataPacket } from "mysql2";

// Tipos de ações auditadas
export type AuditAction = 
  | 'payment_created'
  | 'payment_approved'
  | 'payment_rejected'
  | 'account_paid'
  | 'pix_key_added'
  | 'schedule_validated'
  | 'schedule_rejected'
  | 'employee_updated'
  | 'client_updated';

/**
 * Registrar ação de auditoria
 */
export async function logAudit(
  userId: number,
  action: AuditAction,
  entityType: string,
  entityId: number,
  changes: Record<string, any>
) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.execute(
      sql`
        INSERT INTO audit_logs (userId, action, entityType, entityId, newValues, createdAt)
        VALUES (${userId}, ${action}, ${entityType}, ${entityId}, ${JSON.stringify(changes)}, NOW())
      `
    );
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

const escapeSqlValue = (value: unknown) => {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
};

export const auditRouter = router({
  /**
   * Listar logs de auditoria com paginação e filtros
   */
  getLogs: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        action: z.string().optional(),
        entityType: z.string().optional(),
        userId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Apenas admin pode ver logs de outros usuários
      const filteredUserId = ctx.user.role === 'admin' ? input.userId : ctx.user.id;

      let query = `
        SELECT 
          al.id,
          al.userId,
          u.name as userName,
          al.action,
          al.entityType,
          al.entityId,
          COALESCE(al.newValues, al.oldValues) as changes,
          al.createdAt
        FROM audit_logs al
        LEFT JOIN users u ON al.userId = u.id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (filteredUserId) {
        query += ` AND al.userId = ?`;
        params.push(filteredUserId);
      }

      if (input.action) {
        query += ` AND al.action = ?`;
        params.push(input.action);
      }

      if (input.entityType) {
        query += ` AND al.entityType = ?`;
        params.push(input.entityType);
      }

      if (input.startDate) {
        query += ` AND al.createdAt >= ?`;
        params.push(input.startDate);
      }

      if (input.endDate) {
        query += ` AND al.createdAt < ?`;
        params.push(input.endDate);
      }

      // Contar total
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as t`;
      const resolvedCountQuery = params.reduce(
        (current, value) => current.replace("?", escapeSqlValue(value)),
        countQuery
      );
      const countResult = (await db.execute(
        sql.raw(resolvedCountQuery)
      )) as unknown as RowDataPacket[] | [RowDataPacket[], unknown];
      const countRows = (Array.isArray(countResult[0]) ? countResult[0] : countResult) as RowDataPacket[];
      const total = Number(countRows[0]?.total || 0);

      // Buscar logs com paginação
      const offset = (input.page - 1) * input.limit;
      query += ` ORDER BY al.createdAt DESC LIMIT ? OFFSET ?`;
      params.push(input.limit, offset);

      const resolvedLogsQuery = params.reduce(
        (current, value) => current.replace("?", escapeSqlValue(value)),
        query
      );
      const logsResult = (await db.execute(
        sql.raw(resolvedLogsQuery)
      )) as unknown as RowDataPacket[] | [RowDataPacket[], unknown];
      const logs = (Array.isArray(logsResult[0]) ? logsResult[0] : logsResult) as RowDataPacket[];

      return {
        logs: logs.map((log: any) => ({
          ...log,
          changes: typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes,
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Obter resumo de ações por tipo
   */
  getSummary: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const query = `
        SELECT 
          action,
          COUNT(*) as count,
          COUNT(DISTINCT userId) as uniqueUsers
        FROM audit_logs
        WHERE createdAt >= ? AND createdAt < ?
        GROUP BY action
        ORDER BY count DESC
      `;

      const resolvedQuery = [input.startDate, input.endDate].reduce(
        (current, value) => current.replace("?", escapeSqlValue(value)),
        query
      );
      const summaryResult = (await db.execute(
        sql.raw(resolvedQuery)
      )) as unknown as RowDataPacket[] | [RowDataPacket[], unknown];
      const results = (Array.isArray(summaryResult[0]) ? summaryResult[0] : summaryResult) as RowDataPacket[];

      return results;
    }),

  /**
   * Exportar logs em CSV
   */
  exportLogs: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        action: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      let query = `
        SELECT 
          al.createdAt,
          u.name as userName,
          al.action,
          al.entityType,
          al.entityId,
          COALESCE(al.newValues, al.oldValues) as changes
        FROM audit_logs al
        LEFT JOIN users u ON al.userId = u.id
        WHERE al.createdAt >= ? AND al.createdAt < ?
      `;

      const params: any[] = [input.startDate, input.endDate];

      if (input.action) {
        query += ` AND al.action = ?`;
        params.push(input.action);
      }

      query += ` ORDER BY al.createdAt DESC`;

      const resolvedQuery = params.reduce(
        (current, value) => current.replace("?", escapeSqlValue(value)),
        query
      );
      const exportResult = (await db.execute(
        sql.raw(resolvedQuery)
      )) as unknown as RowDataPacket[] | [RowDataPacket[], unknown];
      const logs = (Array.isArray(exportResult[0]) ? exportResult[0] : exportResult) as RowDataPacket[];

      // Converter para CSV
      const headers = ['Data/Hora', 'Usuário', 'Ação', 'Tipo de Entidade', 'ID da Entidade', 'Mudanças'];
      const rows = logs.map((log: any) => [
        new Date(log.createdAt).toLocaleString('pt-BR'),
        log.userName || 'Desconhecido',
        log.action,
        log.entityType,
        log.entityId,
        typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((cell: unknown) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      return { csv, filename: `auditoria-${new Date().toISOString().split('T')[0]}.csv` };
    }),
});
