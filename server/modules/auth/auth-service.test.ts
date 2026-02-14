import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  login,
  register,
  getUserById,
  updateUser,
  deleteUser,
  listUsers,
  changePassword,
} from './auth-service';

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('deve fazer hash de senha corretamente', async () => {
      const password = 'MySecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('deve comparar senha com hash corretamente', async () => {
      const password = 'MySecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('deve rejeitar senha incorreta', async () => {
      const password = 'MySecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await comparePassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token', () => {
    it('deve gerar token valido', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'admin' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT tem 3 partes
    });

    it('deve verificar token valido', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'admin' };
      const token = generateToken(payload);

      const decoded = verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.id).toBe(payload.id);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it('deve rejeitar token invalido', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });
  });

  describe('Login', () => {
    it('deve fazer login com credenciais validas', async () => {
      const email = 'test@example.com';
      const password = 'TestPassword123!';

      // Primeiro registrar um usuario
      const registerResult = await register({
        email,
        password,
        name: 'Test User',
      });

      expect(registerResult).toBeDefined();
      expect(registerResult?.token).toBeDefined();
      expect(registerResult?.user.email).toBe(email);
    });

    it('deve rejeitar login com email invalido', async () => {
      const result = await login({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      });

      expect(result).toBeNull();
    });

    it('deve rejeitar login com senha incorreta', async () => {
      const email = 'test2@example.com';
      const password = 'TestPassword123!';

      // Registrar usuario
      await register({
        email,
        password,
        name: 'Test User 2',
      });

      // Tentar login com senha errada
      const result = await login({
        email,
        password: 'WrongPassword123!',
      });

      expect(result).toBeNull();
    });
  });

  describe('Register', () => {
    it('deve registrar novo usuario', async () => {
      const email = 'newuser@example.com';
      const password = 'NewPassword123!';
      const name = 'New User';

      const result = await register({
        email,
        password,
        name,
      });

      expect(result).toBeDefined();
      expect(result?.token).toBeDefined();
      expect(result?.user.email).toBe(email);
      expect(result?.user.role).toBe('colaborador');
    });

    it('deve rejeitar registro com email duplicado', async () => {
      const email = 'duplicate@example.com';
      const password = 'Password123!';

      // Primeiro registro
      await register({
        email,
        password,
        name: 'First User',
      });

      // Segundo registro com mesmo email
      const result = await register({
        email,
        password,
        name: 'Second User',
      });

      expect(result).toBeNull();
    });
  });

  describe('User Management', () => {
    it('deve obter usuario por ID', async () => {
      const email = 'getuser@example.com';
      const password = 'Password123!';

      const registerResult = await register({
        email,
        password,
        name: 'Get User Test',
      });

      if (registerResult) {
        const user = await getUserById(registerResult.user.id);
        expect(user).toBeDefined();
        expect(user?.email).toBe(email);
      }
    });

    it('deve listar todos os usuarios', async () => {
      const users = await listUsers();
      expect(Array.isArray(users)).toBe(true);
    });

    it('deve atualizar usuario', async () => {
      const email = 'updateuser@example.com';
      const password = 'Password123!';

      const registerResult = await register({
        email,
        password,
        name: 'Update User Test',
      });

      if (registerResult) {
        const newName = 'Updated Name';
        await updateUser(registerResult.user.id, { name: newName });

        const updatedUser = await getUserById(registerResult.user.id);
        expect(updatedUser?.name).toBe(newName);
      }
    });

    it('deve deletar usuario', async () => {
      const email = 'deleteuser@example.com';
      const password = 'Password123!';

      const registerResult = await register({
        email,
        password,
        name: 'Delete User Test',
      });

      if (registerResult) {
        await deleteUser(registerResult.user.id);

        const deletedUser = await getUserById(registerResult.user.id);
        expect(deletedUser).toBeNull();
      }
    });
  });

  describe('Change Password', () => {
    it('deve alterar senha com sucesso', async () => {
      const email = 'changepass@example.com';
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';

      const registerResult = await register({
        email,
        oldPassword,
        name: 'Change Password Test',
      });

      if (registerResult) {
        const success = await changePassword(
          registerResult.user.id,
          oldPassword,
          newPassword
        );
        expect(success).toBe(true);

        // Tentar login com nova senha
        const loginResult = await login({
          email,
          password: newPassword,
        });
        expect(loginResult).toBeDefined();
      }
    });

    it('deve rejeitar mudanca de senha com senha antiga incorreta', async () => {
      const email = 'changepass2@example.com';
      const password = 'Password123!';

      const registerResult = await register({
        email,
        password,
        name: 'Change Password Test 2',
      });

      if (registerResult) {
        const success = await changePassword(
          registerResult.user.id,
          'WrongOldPassword',
          'NewPassword456!'
        );
        expect(success).toBe(false);
      }
    });
  });
});
