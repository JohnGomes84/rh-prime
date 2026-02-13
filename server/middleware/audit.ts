import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';

/**
 * Middleware de auditoria para rastrear todas as alterações
 */
export async function auditMiddleware(
  userAction: string,
  tableName: string,
  recordId: number,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  performedBy: string = 'system'
) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      action: userAction,
      resource: tableName,
      resourceId: recordId,
      changesBefore: oldValues,
      changesAfter: newValues,
      description: `${userAction} by ${performedBy}`,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
    // Não falha a operação principal se auditoria falhar
  }
}

/**
 * Função helper para log de alterações
 */
export function logChange(
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, any> {
  const changes: Record<string, any> = {};

  for (const key in after) {
    if (before[key] !== after[key]) {
      changes[key] = {
        before: before[key],
        after: after[key],
      };
    }
  }

  return changes;
}
