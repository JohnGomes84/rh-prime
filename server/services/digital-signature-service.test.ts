import { describe, it, expect } from 'vitest';
import {
  calculateDocumentHash,
  signDocumentHash,
  validateSignature,
} from './digital-signature-service';

describe('Digital Signature Service', () => {
  describe('calculateDocumentHash', () => {
    it('deve calcular hash SHA-256 do documento', () => {
      const content = Buffer.from('Documento de teste');
      const hash = calculateDocumentHash(content);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 em hex = 64 caracteres
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve gerar hash diferente para conteúdos diferentes', () => {
      const hash1 = calculateDocumentHash(Buffer.from('Documento 1'));
      const hash2 = calculateDocumentHash(Buffer.from('Documento 2'));

      expect(hash1).not.toBe(hash2);
    });

    it('deve gerar hash igual para mesmo conteúdo', () => {
      const content = Buffer.from('Documento de teste');
      const hash1 = calculateDocumentHash(content);
      const hash2 = calculateDocumentHash(content);

      expect(hash1).toBe(hash2);
    });
  });

  describe('signDocumentHash', () => {
    it('deve assinar hash do documento com CPF', () => {
      const documentHash = calculateDocumentHash(Buffer.from('Teste'));
      const cpf = '12345678901';
      const signature = signDocumentHash(documentHash, cpf);

      expect(signature).toBeDefined();
      expect(signature).toHaveLength(64); // HMAC-SHA256 em hex
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve gerar assinatura diferente para CPFs diferentes', () => {
      const documentHash = calculateDocumentHash(Buffer.from('Teste'));
      const sig1 = signDocumentHash(documentHash, '12345678901');
      const sig2 = signDocumentHash(documentHash, '98765432109');

      expect(sig1).not.toBe(sig2);
    });

    it('deve gerar assinatura igual para mesmo CPF e hash', () => {
      const documentHash = calculateDocumentHash(Buffer.from('Teste'));
      const cpf = '12345678901';
      const sig1 = signDocumentHash(documentHash, cpf);
      const sig2 = signDocumentHash(documentHash, cpf);

      expect(sig1).toBe(sig2);
    });
  });

  describe('validateSignature', () => {
    it('deve validar assinatura correta', () => {
      const documentHash = calculateDocumentHash(Buffer.from('Documento'));
      const cpf = '12345678901';
      const signatureHash = signDocumentHash(documentHash, cpf);

      const isValid = validateSignature(documentHash, signatureHash, cpf);
      expect(isValid).toBe(true);
    });

    it('deve rejeitar assinatura inválida', () => {
      const documentHash = calculateDocumentHash(Buffer.from('Documento'));
      const cpf = '12345678901';
      const invalidSignature = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      const isValid = validateSignature(documentHash, invalidSignature, cpf);
      expect(isValid).toBe(false);
    });

    it('deve rejeitar assinatura com CPF diferente', () => {
      const documentHash = calculateDocumentHash(Buffer.from('Documento'));
      const cpf1 = '12345678901';
      const cpf2 = '98765432109';
      const signatureHash = signDocumentHash(documentHash, cpf1);

      const isValid = validateSignature(documentHash, signatureHash, cpf2);
      expect(isValid).toBe(false);
    });

    it('deve rejeitar assinatura com hash alterado', () => {
      const documentHash = calculateDocumentHash(Buffer.from('Documento'));
      const cpf = '12345678901';
      const signatureHash = signDocumentHash(documentHash, cpf);

      const alteredHash = calculateDocumentHash(Buffer.from('Documento Alterado'));
      const isValid = validateSignature(alteredHash, signatureHash, cpf);
      expect(isValid).toBe(false);
    });
  });

  describe('Cenários de Compliance', () => {
    it('deve detectar documento alterado após assinatura', () => {
      const originalContent = Buffer.from('Contrato Original');
      const originalHash = calculateDocumentHash(originalContent);
      const cpf = '12345678901';
      const signature = signDocumentHash(originalHash, cpf);

      // Simular alteração do documento
      const alteredContent = Buffer.from('Contrato Alterado');
      const alteredHash = calculateDocumentHash(alteredContent);

      // Validação deve falhar
      const isValid = validateSignature(alteredHash, signature, cpf);
      expect(isValid).toBe(false);
    });

    it('deve manter rastreabilidade com CPF', () => {
      const documentHash = calculateDocumentHash(Buffer.from('ASO'));
      const cpf = '12345678901';
      const signature = signDocumentHash(documentHash, cpf);

      // CPF deve estar vinculado à assinatura
      const isValid = validateSignature(documentHash, signature, cpf);
      expect(isValid).toBe(true);

      // Outro CPF não pode validar
      const otherCpf = '98765432109';
      const isValidOther = validateSignature(documentHash, signature, otherCpf);
      expect(isValidOther).toBe(false);
    });

    it('deve suportar múltiplas assinaturas no mesmo documento', () => {
      const documentHash = calculateDocumentHash(Buffer.from('Contrato'));

      // Assinatura 1: Gestor
      const cpf1 = '11111111111';
      const sig1 = signDocumentHash(documentHash, cpf1);

      // Assinatura 2: Colaborador
      const cpf2 = '22222222222';
      const sig2 = signDocumentHash(documentHash, cpf2);

      // Ambas devem ser válidas
      expect(validateSignature(documentHash, sig1, cpf1)).toBe(true);
      expect(validateSignature(documentHash, sig2, cpf2)).toBe(true);

      // Cruzamento deve falhar
      expect(validateSignature(documentHash, sig1, cpf2)).toBe(false);
      expect(validateSignature(documentHash, sig2, cpf1)).toBe(false);
    });
  });
});
