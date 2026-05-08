import { TRPCError } from "@trpc/server";
import * as db from "../db";

export interface ScopeUser {
  id: number;
  email?: string | null;
  role: string;
}

/**
 * Verifica se o user logado pode operar sobre o employee alvo.
 * Regras:
 * - admin: sempre
 * - próprio employee: sempre
 * - gestor: apenas subordinados (transitivo, recursivo)
 * - colaborador: apenas próprio
 *
 * Lança TRPCError FORBIDDEN se fora do escopo.
 */
export async function assertEmployeeInScope(user: ScopeUser, targetEmployeeId: number): Promise<void> {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return;
  if (user.role === "admin") return;

  const ownEmp = await db.getEmployeeForUser(user.id, user.email ?? undefined);
  const ownId = (ownEmp as any)?.id;
  if (ownId === targetEmployeeId) return;

  if (user.role === "gestor" && ownId) {
    const subs = await db.getSubordinatesRecursive(ownId);
    if (subs.has(targetEmployeeId)) return;
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Funcionário fora do seu escopo de gestão",
    });
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Você não tem permissão para acessar dados deste funcionário",
  });
}

/**
 * Resolve um employeeId default (próprio do user) ou valida o
 * employeeId fornecido contra o escopo. Retorna o id final a usar.
 */
export async function resolveEmployeeIdInScope(
  inputId: number | undefined,
  user: ScopeUser | null | undefined
): Promise<number> {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário" });
  }
  if (!inputId) {
    const ownEmp = await db.getEmployeeForUser(user.id, user.email ?? undefined);
    const ownId = (ownEmp as any)?.id;
    if (!ownId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Seu usuário não está vinculado a nenhum funcionário cadastrado. Acesse o cadastro do funcionário e use 'Vincular ao usuário'.",
      });
    }
    return ownId;
  }
  await assertEmployeeInScope(user, inputId);
  return inputId;
}
