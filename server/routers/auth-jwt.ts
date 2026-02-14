import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  login,
  register,
  getUserById,
  updateUser,
  deleteUser,
  listUsers,
  changePassword,
} from '../modules/auth/auth-service';
import { TRPCError } from '@trpc/server';

export const authJwtRouter = router({
  /**
   * Login com email e senha
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const result = await login(input);
      if (!result) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Email ou senha inválidos',
        });
      }
      return result;
    }),

  /**
   * Registrar novo usuário
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(3),
      })
    )
    .mutation(async ({ input }) => {
      const result = await register(input);
      if (!result) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email já cadastrado ou erro ao registrar',
        });
      }
      return result;
    }),

  /**
   * Obter dados do usuário autenticado
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Usuário não encontrado',
      });
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }),

  /**
   * Alterar senha
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const success = await changePassword(ctx.user.id, input.oldPassword, input.newPassword);
      if (!success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Senha antiga incorreta',
        });
      }
      return { success: true };
    }),

  /**
   * Listar todos os usuários (apenas admin)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Apenas administradores podem listar usuários',
      });
    }
    const users = await listUsers();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }),

  /**
   * Atualizar usuário (admin ou próprio usuário)
   */
  update: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        role: z.enum(['admin', 'gestor', 'colaborador']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verificar permissão
      if (ctx.user.role !== 'admin' && ctx.user.id !== input.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para atualizar este usuário',
        });
      }

      // Admin pode alterar role, mas usuário não pode alterar o próprio role
      if (ctx.user.role !== 'admin' && input.role) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não pode alterar seu próprio role',
        });
      }

      const data: any = {};
      if (input.email) data.email = input.email;
      if (input.name) data.name = input.name;
      if (input.role && ctx.user.role === 'admin') data.role = input.role;

      await updateUser(input.userId, data);

      return { success: true };
    }),

  /**
   * Deletar usuário (apenas admin)
   */
  delete: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem deletar usuários',
        });
      }

      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Você não pode deletar sua própria conta',
        });
      }

      await deleteUser(input.userId);

      return { success: true };
    }),
});
