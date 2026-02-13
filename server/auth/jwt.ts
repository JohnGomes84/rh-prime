import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ENV } from '../_core/env';

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'admin' | 'gestor' | 'colaborador';
}

/**
 * Fazer hash de senha com bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verificar senha
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Criar JWT token
 */
export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, ENV.jwtSecret, { expiresIn: '24h' });
}

/**
 * Verificar e decodificar JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, ENV.jwtSecret) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Validar força de senha
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter no mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
