import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { logAudit, extractAuditContext } from "../audit-middleware";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const requireRole = (roles: Array<'admin' | 'gestor' | 'colaborador' | 'user'>) =>
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    if (!roles.includes(ctx.user.role as any)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });

const auditMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now();
  const result = await next();

  if (type !== 'mutation') return result;

  const action = path.toLowerCase().includes('delete')
    ? 'DELETE'
    : path.toLowerCase().includes('update') || path.toLowerCase().includes('upsert')
      ? 'UPDATE'
      : path.toLowerCase().includes('create') || path.toLowerCase().includes('register')
        ? 'CREATE'
        : 'UPDATE';

  const [resource] = path.split('.');
  const auditCtx = extractAuditContext({
    user: ctx.user ? { id: ctx.user.id, cpf: (ctx.user as any).cpf } : undefined,
    headers: ctx.req?.headers ?? {},
    socket: ctx.req?.socket ?? {},
  });

  void logAudit(
    action as any,
    resource ?? path,
    null,
    auditCtx,
    undefined,
    undefined,
    `${path} ${result.ok ? 'ok' : 'failed'} ${Date.now() - start}ms`,
  );

  return result;
});

export const protectedProcedure = t.procedure.use(requireUser).use(auditMiddleware);
export const adminProcedure = t.procedure.use(requireRole(['admin'])).use(auditMiddleware);
export const managerProcedure = t.procedure.use(requireRole(['admin', 'gestor'])).use(auditMiddleware);
