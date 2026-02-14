import { eq } from 'drizzle-orm';
import * as db from '../../db';
import { users } from '../../../drizzle/schema';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '7d';

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

/**
 * Hash de senha com bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Comparar senha com hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gerar JWT token
 */
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verificar JWT token
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Login - retorna token JWT
 */
export async function login(request: LoginRequest): Promise<{ token: string; user: AuthPayload } | null> {
  const user = await db.getUser(request.email);

  if (!user || !user.passwordHash) {
    return null;
  }

  const isPasswordValid = await comparePassword(request.password, user.passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  const payload: AuthPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const token = generateToken(payload);

  return {
    token,
    user: payload,
  };
}

/**
 * Registrar novo usuário
 */
export async function register(request: RegisterRequest): Promise<{ token: string; user: AuthPayload } | null> {
  // Verificar se usuário já existe
  const existingUser = await db.getUser(request.email);

  if (existingUser) {
    return null;
  }

  const passwordHash = await hashPassword(request.password);

  const newUser = await db.createUser({
    email: request.email,
    name: request.name,
    passwordHash,
    role: 'colaborador',
    loginMethod: 'jwt',
  });

  if (!newUser) {
    return null;
  }

  const payload: AuthPayload = {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
  };

  const token = generateToken(payload);

  return {
    token,
    user: payload,
  };
}

/**
 * Obter usuário por ID
 */
export async function getUserById(id: number) {
  return db.getUserById(id);
}

/**
 * Atualizar usuário
 */
export async function updateUser(id: number, data: Partial<{ email: string; name: string; role: string }>) {
  return db.updateUser(id, data);
}

/**
 * Deletar usuário
 */
export async function deleteUser(id: number) {
  return db.deleteUser(id);
}

/**
 * Listar todos os usuários
 */
export async function listUsers() {
  return db.listUsers();
}

/**
 * Alterar senha
 */
export async function changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user || !user.passwordHash) {
    return false;
  }

  const isPasswordValid = await comparePassword(oldPassword, user.passwordHash);
  if (!isPasswordValid) {
    return false;
  }

  const newPasswordHash = await hashPassword(newPassword);
  await updateUser(userId, { passwordHash: newPasswordHash });

  return true;
}
