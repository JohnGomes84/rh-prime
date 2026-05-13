export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  extractTokenFromHeader,
  verifyToken,
  type UserRole,
  type JWTPayload,
} from './jwt-service.js';

import { createToken as _createToken, type JWTPayload, type UserRole } from './jwt-service.js';

export function createToken(payload: { userId: number; email: string; role: UserRole }): string {
  return _createToken(payload.userId, payload.email, payload.role);
}
