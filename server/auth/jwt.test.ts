import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  validatePasswordStrength,
} from './jwt';

describe('JWT Service', () => {
  describe('Password Hashing', () => {
    it('deve fazer hash de senha', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('deve verificar senha correta', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('deve rejeitar senha incorreta', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Password Strength', () => {
    it('deve aceitar senha forte', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar senha muito curta', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve rejeitar senha sem maiúscula', () => {
      const result = validatePasswordStrength('password123!');
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar senha sem número', () => {
      const result = validatePasswordStrength('PasswordTest!');
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar senha sem caractere especial', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.valid).toBe(false);
    });
  });

  describe('JWT Token', () => {
    it('deve criar token válido', () => {
      const token = createToken({
        userId: 1,
        email: 'test@example.com',
        role: 'admin',
      });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('deve verificar token válido', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'gestor' as const,
      };
      const token = createToken(payload);
      const decoded = verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(1);
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe('gestor');
    });

    it('deve rejeitar token inválido', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('deve suportar todos os roles', () => {
      const roles = ['admin', 'gestor', 'colaborador'] as const;
      roles.forEach(role => {
        const token = createToken({
          userId: 1,
          email: 'test@example.com',
          role,
        });
        const decoded = verifyToken(token);
        expect(decoded?.role).toBe(role);
      });
    });
  });
});
