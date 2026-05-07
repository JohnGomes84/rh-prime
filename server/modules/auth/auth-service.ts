import * as db from '../../db';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken as verifyJwtToken,
  type UserRole,
} from '../../auth/jwt-service';

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
  const existing = await db.getUser(request.email);
  if (existing) return null;

  const passwordHash = await hashPassword(request.password);
  const newUser = await db.createUser({
    email: request.email,
    name: request.name,
    passwordHash,
    role: 'colaborador',
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
