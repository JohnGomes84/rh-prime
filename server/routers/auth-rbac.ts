import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  createToken,
  validatePasswordStrength,
} from '../auth/jwt-service';

export const authRbacRouter = router({
  /**
   * Login com email e senha
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(1, 'Senha obrigatória'),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Buscar usuário
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      const user = result[0];
      if (!user || !user.passwordHash) {
        throw new Error('Email ou senha inválidos');
      }

      // Verificar senha
      const passwordValid = await verifyPassword(input.password, user.passwordHash);
      if (!passwordValid) {
        throw new Error('Email ou senha inválidos');
      }

      // Gerar token
      const token = createToken(user.id, user.email, user.role as any);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
        name: z.string().min(1, 'Nome obrigatório'),
        role: z.enum(['admin', 'gestor', 'colaborador']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Apenas admin pode criar usuários
      if (ctx.user?.role !== 'admin') {
        throw new Error('Apenas administradores podem criar usuários');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Validar força da senha
      const passwordValidation = validatePasswordStrength(input.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Verificar se email já existe
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new Error('Email já cadastrado');
      }

      // Hash da senha
      const passwordHash = await hashPassword(input.password);

      // Criar usuário
      const result = await db.insert(users).values({
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
        loginMethod: 'jwt',
      });

      return {
        success: true,
        userId: (result as any)[0],
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
      if (!ctx.user) throw new Error('Não autenticado');

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Buscar usuário
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const user = result[0];
      if (!user || !user.passwordHash) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar senha atual
      const passwordValid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!passwordValid) {
        throw new Error('Senha atual inválida');
      }

      // Validar força da nova senha
      const passwordValidation = validatePasswordStrength(input.newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Hash da nova senha
      const newPasswordHash = await hashPassword(input.newPassword);

      // Atualizar
      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
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

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users);

    return result;
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

      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Obter informações do usuário atual
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error('Não autenticado');

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
    };
  }),
});
