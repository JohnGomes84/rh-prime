import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as db from '../db';
import {
  hashPassword,
  verifyPassword,
  createToken,
  validatePasswordStrength,
} from '../auth/jwt-service';
import { changePassword as changeOwnPassword } from "../modules/auth/auth-service";

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
      const user = await db.getUser(input.email);
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

      const passwordValidation = validatePasswordStrength(input.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const existing = await db.getUser(input.email);
      if (existing) {
        throw new Error('Email já cadastrado');
      }

      // Hash da senha
      const passwordHash = await hashPassword(input.password);

      // Criar usuário
      const user = await db.createUser({
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
        loginMethod: 'jwt',
      });

      return {
        success: true,
        userId: user?.id ?? 0,
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
      const passwordChanged = await changeOwnPassword(
        ctx.user.id,
        input.currentPassword,
        input.newPassword
      );
      if (!passwordChanged) {
        throw new Error('Senha atual inválida');
      }
      return { success: true };
    }),

  /**
   * Listar usuários (admin apenas)
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== 'admin') {
      throw new Error('Apenas administradores podem listar usuários');
    }

    const result = await db.listUsers();
    return result.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
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

      await db.updateUser(input.userId, { role: input.role });

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
