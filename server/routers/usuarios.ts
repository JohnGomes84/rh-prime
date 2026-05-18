import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users, SYSTEM_MODULES } from "../../drizzle/schema";
import type { SystemModule } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import {
  getUserPermissions,
  setUserModulePermission,
  setAllUserPermissions,
  listUsersWithPermissions,
  invalidateUserPermissions,
} from "../controle/permissionControl";
import { logAudit } from "../controle/auditControl";

export const usuariosRouter = router({
  // Listar todos os usuários com suas permissões (admin only)
  list: adminProcedure.query(async () => {
    return listUsersWithPermissions();
  }),

  // Obter permissões do usuário logado
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    return getUserPermissions(ctx.user.id);
  }),

  // Obter permissões de um usuário específico (admin only)
  getPermissions: adminProcedure.input(z.number()).query(async ({ input }) => {
    return getUserPermissions(input);
  }),

  // Definir permissão de um módulo para um usuário (admin only)
  setModulePermission: adminProcedure
    .input(z.object({
      userId: z.number(),
      module: z.string(),
      canView: z.boolean(),
      canCreate: z.boolean(),
      canEdit: z.boolean(),
      canDelete: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId, module, ...perms } = input;
      
      // Não permitir alterar permissões de admin
      const targetUser = await (await getDb())?.select().from(users).where(eq(users.id, userId)).limit(1);
      if (targetUser?.[0]?.role === "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível alterar permissões de administradores" });
      }

      const success = await setUserModulePermission(userId, module as SystemModule, perms);
      
      if (success) {
        await logAudit(ctx.user.id, "UPDATE_PERMISSION", "user_permissions", userId, null, { module, ...perms });
      }
      
      return { success };
    }),

  // Definir todas as permissões de um usuário de uma vez (admin only)
  setAllPermissions: adminProcedure
    .input(z.object({
      userId: z.number(),
      permissions: z.record(z.string(), z.object({
        canView: z.boolean(),
        canCreate: z.boolean(),
        canEdit: z.boolean(),
        canDelete: z.boolean(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetUser = await (await getDb())?.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser?.[0]?.role === "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível alterar permissões de administradores" });
      }

      const success = await setAllUserPermissions(input.userId, input.permissions as any);
      
      if (success) {
        await logAudit(ctx.user.id, "UPDATE_ALL_PERMISSIONS", "user_permissions", input.userId, null, input.permissions);
      }
      
      return { success };
    }),

  // Promover/rebaixar role (admin only)
  setRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "leader"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível alterar seu próprio papel" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      invalidateUserPermissions(input.userId);
      await logAudit(ctx.user.id, "UPDATE_ROLE", "users", input.userId, null, { role: input.role });

      return { success: true };
    }),

  // Listar módulos disponíveis
  modules: protectedProcedure.query(() => {
    return SYSTEM_MODULES.map(mod => ({
      id: mod,
      label: getModuleLabel(mod),
    }));
  }),
});

function getModuleLabel(mod: string): string {
  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    employees: "Funcionários",
    clients: "Clientes",
    suppliers: "Fornecedores",
    shifts: "Turnos",
    functions: "Funções",
    cost_centers: "Centros de Custo",
    bank_accounts: "Contas Bancárias",
    accounts_payable: "Contas a Pagar",
    accounts_receivable: "Contas a Receber",
    payment_batches: "Lotes de Pagamento",
    schedules: "Planejamentos",
    documents: "Documentos",
    analytics: "Analytics",
    users: "Usuários",
  };
  return labels[mod] || mod;
}
