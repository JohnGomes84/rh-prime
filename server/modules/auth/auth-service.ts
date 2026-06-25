import crypto from 'node:crypto';
import * as db from '../../db.js';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken as verifyJwtToken,
  validatePasswordStrength,
  type UserRole,
} from '../../auth/jwt-service.js';
import { sendEmail } from '../../integrations/email-service.js';

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

const ALLOWED_DOMAIN = "mlservicoseco.com.br";

const ADMIN_EMAILS = new Set(
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

export function isPublicRegistrationEnabled(): boolean {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return true;
  return process.env.PUBLIC_REGISTRATION_ENABLED === "true";
}

export function isEmailAllowedToRegister(email: string): boolean {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return true;
  if (!isPublicRegistrationEnabled()) return false;
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain === ALLOWED_DOMAIN;
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
  if ((user as any).status === "inactive") return null;

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

  const role = ADMIN_EMAILS.has(request.email.trim().toLowerCase())
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

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildResetPasswordUrl(rawToken: string): string {
  const configured = process.env.APP_URL ?? "https://public-self-eight.vercel.app";
  let origin: string;

  try {
    origin = new URL(configured).origin;
  } catch {
    origin = "https://public-self-eight.vercel.app";
  }

  const url = new URL("/reset-password", origin);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await db.getUser(email);
  if (!user) return;
  if ((user as any).status === "inactive") return;

  const rawToken = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await db.setResetToken(user.id, tokenHash, expiresAt);

  const resetUrl = buildResetPasswordUrl(rawToken);

  await sendEmail({
    to: user.email,
    subject: "RH Prime — Redefinição de senha",
    html: `
      <h2>Redefinição de senha</h2>
      <p>Olá ${user.name ? user.name : ""},</p>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Redefinir minha senha</a></p>
      <p style="font-size:13px;color:#666;">Este link expira em 1 hora. Se você não solicitou, ignore este email.</p>
      <p>Atenciosamente,<br>RH Prime</p>
    `,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new Error(strength.errors.join("; "));
  }

  const tokenHash = hashToken(token);
  const user = await db.getUserByResetToken(tokenHash);
  if (!user) return false;
  if ((user as any).status === "inactive") return false;

  const newHash = await hashPassword(newPassword);
  await db.updateUser(user.id, { passwordHash: newHash });
  await db.clearResetToken(user.id);
  return true;
}
