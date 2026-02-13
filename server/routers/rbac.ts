import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { createToken, hashPassword, verifyPassword, validatePasswordStrength } from '../auth/jwt';

export const rbacRouter = router({
  /**
   * Login com email e senha
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(1, 'Senha é obrigatória'),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Buscar usuário
      const user = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

      if (!user[0]) {
        throw new Error('Email ou senha incorretos');
      }

      // Verificar senha
      if (!user[0].passwordHash) {
        throw new Error('Usuário não tem senha configurada');
      }

      const isPasswordValid = await verifyPassword(input.password, user[0].passwordHash);
      if (!isPasswordValid) {
        throw new Error('Email ou senha incorretos');
      }

      // Verificar se usuário está ativo
      if (user[0].status !== 'ativo') {
        throw new Error('Usuário inativo ou bloqueado');
      }

      // Criar token
      const token = createToken({
        userId: user[0].id,
        email: user[0].email,
        role: (user[0].role as any) || 'colaborador',
      });

      return {
        token,
        user: {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          role: user[0].role,
        },
      };
    }),

  /**
   * Registrar novo usuário (admin apenas)
   */
  register: protectedProcedure
    .input(
      z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
        name: z.string().min(1, 'Nome é obrigatório'),
        role: z.enum(['admin', 'gestor', 'colaborador']).default('colaborador'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'admin') {
        throw new Error('Apenas administradores podem registrar usuários');
      }

      // Validar força de senha
      const passwordValidation = validatePasswordStrength(input.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join('; '));
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar se email já existe
      const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing[0]) {
        throw new Error('Email já cadastrado');
      }

      // Hash de senha
      const passwordHash = await hashPassword(input.password);

      // Inserir usuário
      const result = await db.insert(users).values({
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
        status: 'ativo',
        loginMethod: 'jwt',
      });

      return {
        success: true,
        message: 'Usuário registrado com sucesso',
      };
    }),

  /**
   * Alterar senha
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error('Usuário não autenticado');

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Buscar usuário
      const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!user[0]) throw new Error('Usuário não encontrado');

      // Verificar senha atual
      if (!user[0].passwordHash) {
        throw new Error('Usuário não tem senha configurada');
      }

      const isPasswordValid = await verifyPassword(input.currentPassword, user[0].passwordHash);
      if (!isPasswordValid) {
        throw new Error('Senha atual incorreta');
      }

      // Validar nova senha
      const passwordValidation = validatePasswordStrength(input.newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join('; '));
      }

      // Hash nova senha
      const newPasswordHash = await hashPassword(input.newPassword);

      // Atualizar
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: 'Senha alterada com sucesso',
      };
    }),

  /**
   * Obter dados do usuário autenticado
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error('Usuário não autenticado');

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user[0]) throw new Error('Usuário não encontrado');

    return {
      id: user[0].id,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role,
      status: user[0].status,
    };
  }),

  /**
   * Listar usuários (admin apenas)
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== 'admin') {
      throw new Error('Apenas administradores podem listar usuários');
    }

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const allUsers = await db.select().from(users);

    return allUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    }));
  }),

  /**
   * Atualizar role de usuário (admin apenas)
   */
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(['admin', 'gestor', 'colaborador']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'admin') {
        throw new Error('Apenas administradores podem alterar roles');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));

      return {
        success: true,
        message: 'Role atualizado com sucesso',
      };
    }),

  /**
   * Bloquear/desbloquear usuário (admin apenas)
   */
  toggleUserStatus: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        status: z.enum(['ativo', 'inativo', 'bloqueado']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'admin') {
        throw new Error('Apenas administradores podem alterar status de usuários');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.update(users).set({ status: input.status }).where(eq(users.id, input.userId));

      return {
        success: true,
        message: `Usuário ${input.status === 'ativo' ? 'ativado' : 'desativado'} com sucesso`,
      };
    }),
});
