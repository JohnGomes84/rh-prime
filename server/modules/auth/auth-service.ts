import * as db from '../../db.js';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken as verifyJwtToken,
  type UserRole,
} from '../../auth/jwt-service.js';

export interface AuthPayload {
  id: number;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

const ALLOWED_REGISTER_EMAILS = new Set(
  (process.env.ALLOWED_REGISTER_EMAILS ??
    "adm@mlservicoseco.com.br,mayk.lopes@mlservicoseco.com.br,ediani@mlservicoseco.com.br,operacao@mlservicoseco.com.br,comercial@mlservicoseco.com.br,rh@mlservicoseco.com.br")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export class RegisterEmailNotAllowedError extends Error {
  constructor(email: string) {
    super(`Email não autorizado para cadastro: ${email}`);
    this.name = "RegisterEmailNotAllowedError";
  }
}

export function isEmailAllowedToRegister(email: string): boolean {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return true;
  return ALLOWED_REGISTER_EMAILS.has(email.trim().toLowerCase());
}

export { hashPassword, verifyPassword as comparePassword };

export function verifyToken(token: string): (AuthPayload & { iat?: number; exp?: number }) | null {
  const decoded = verifyJwtToken(token) as any;
  if (!decoded) return null;
  return {
    id: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    iat: decoded.iat,
    exp: decoded.exp,
  } as any;
}

export function generateToken(payload: AuthPayload): string {
  return createToken(payload.id, payload.email, payload.role as UserRole);
}

export async function login(request: LoginRequest): Promise<{ token: string; user: AuthPayload } | null> {
  const user = await db.getUser(request.email);
  if (!user || !user.passwordHash) return null;

  const isValid = await verifyPassword(request.password, user.passwordHash);
  if (!isValid) return null;

  const payload: AuthPayload = { id: user.id, email: user.email, role: user.role };
  return { token: generateToken(payload), user: payload };
}

export async function register(request: RegisterRequest): Promise<{ token: string; user: AuthPayload } | null> {
  if (!isEmailAllowedToRegister(request.email)) {
    throw new RegisterEmailNotAllowedError(request.email);
  }

  const passwordHash = await hashPassword(request.password);
  const existing = await db.getUser(request.email);

  if (existing) {
    if (existing.passwordHash) return null;
    await db.updateUser(existing.id, { passwordHash, name: request.name });
    const payload: AuthPayload = { id: existing.id, email: existing.email, role: existing.role };
    return { token: generateToken(payload), user: payload };
  }

  const role = ALLOWED_REGISTER_EMAILS.has(request.email.trim().toLowerCase())
    ? 'admin'
    : 'colaborador';
  const newUser = await db.createUser({
    email: request.email,
    name: request.name,
    passwordHash,
    role,
    loginMethod: 'jwt',
  });
  if (!newUser) return null;

  const payload: AuthPayload = { id: newUser.id, email: newUser.email, role: newUser.role };
  return { token: generateToken(payload), user: payload };
}

export async function getUserById(id: number) {
  return db.getUserById(id);
}

export async function updateUser(id: number, data: Partial<{ email: string; name: string; role: string }>) {
  return db.updateUser(id, data);
}

export async function deleteUser(id: number) {
  return db.deleteUser(id);
}

export async function listUsers() {
  return db.listUsers();
}

export async function changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user || !user.passwordHash) return false;

  const isValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isValid) return false;

  const newHash = await hashPassword(newPassword);
  await db.updateUser(userId, { passwordHash: newHash });
  return true;
}
