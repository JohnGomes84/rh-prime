import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb, listAuditLogByCpf } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const auditCpfRouter = router({
  /**
   * Obter histórico completo de auditoria por CPF
   * Apenas admin e gestor podem acessar
   */
  getByCpf: protectedProcedure
    .input(z.object({ cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido') }))
    .query(async ({ ctx, input }) => {
      // Apenas admin e gestor podem consultar auditoria
      if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'gestor') {
        throw new Error('Permissão negada');
      }

      const logs = await listAuditLogByCpf(input.cpf);
      return logs || [];
    }),

  /**
   * Obter histórico de auditoria do próprio usuário
   */
  getMyHistory: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error('Usuário não autenticado');

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar CPF do usuário autenticado
    const userLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, ctx.user.id))
      .limit(100);

    return userLogs || [];
  }),

  /**
   * Estatísticas de auditoria por CPF
   */
  getStatsByCpf: protectedProcedure
    .input(z.object({ cpf: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'admin') {
        throw new Error('Apenas administradores podem acessar estatísticas');
      }

      const logs = await listAuditLogByCpf(input.cpf);
      if (!logs || logs.length === 0) {
        return {
          cpf: input.cpf,
          totalOperations: 0,
          byAction: {},
          byResource: {},
          firstOperation: null,
          lastOperation: null,
        };
      }

      const byAction: Record<string, number> = {};
      const byResource: Record<string, number> = {};

      logs.forEach(log => {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
        byResource[log.resource] = (byResource[log.resource] || 0) + 1;
      });

      return {
        cpf: input.cpf,
        totalOperations: logs.length,
        byAction,
        byResource,
        firstOperation: logs[logs.length - 1]?.timestamp,
        lastOperation: logs[0]?.timestamp,
      };
    }),

  /**
   * Exportar auditoria por CPF (para compliance/LGPD)
   */
  exportByCpf: protectedProcedure
    .input(z.object({ cpf: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'admin') {
        throw new Error('Apenas administradores podem exportar auditoria');
      }

      const logs = await listAuditLogByCpf(input.cpf);
      
      return {
        cpf: input.cpf,
        exportDate: new Date().toISOString(),
        totalRecords: logs?.length || 0,
        records: logs?.map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          description: log.description,
          ipAddress: log.ipAddress,
          changesBefore: log.changesBefore,
          changesAfter: log.changesAfter,
        })) || [],
      };
    }),
});
