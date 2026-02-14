import { describe, it, expect } from 'vitest';
import {
  clockInSchema,
  overtimeRequestSchema,
  overtimeApprovalSchema,
  overtimeCalculationSchema,
} from './overtime';

describe('Schemas de RH Prime - Ponto e Horas Extras', () => {
  // ============================================================
  // TESTES DE CLOCK-IN
  // ============================================================
  describe('clockInSchema', () => {
    it('valida clockIn com employeeId válido (UUID)', () => {
      const input = { employeeId: '550e8400-e29b-41d4-a716-446655440000' };
      const parsed = clockInSchema.parse(input);
      expect(parsed.employeeId).toBe(input.employeeId);
      expect(parsed.timestamp).toBeInstanceOf(Date);
    });

    it('rejeita clockIn com employeeId inválido (não-UUID)', () => {
      expect(() => clockInSchema.parse({ employeeId: '123' })).toThrow();
    });

    it('rejeita clockIn com employeeId vazio', () => {
      expect(() => clockInSchema.parse({ employeeId: '' })).toThrow();
    });

    it('aceita timestamp customizado', () => {
      const customDate = new Date('2026-02-14T10:00:00Z');
      const input = {
        employeeId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: customDate,
      };
      const parsed = clockInSchema.parse(input);
      expect(parsed.timestamp).toEqual(customDate);
    });
  });

  // ============================================================
  // TESTES DE SOLICITAÇÃO DE HORAS EXTRAS
  // ============================================================
  describe('overtimeRequestSchema', () => {
    const validInput = {
      employeeId: '550e8400-e29b-41d4-a716-446655440000',
      date: new Date(),
      hoursWorked: 8,
      reason: 'Projeto urgente com cliente importante',
    };

    it('valida solicitação de horas extras completa', () => {
      const parsed = overtimeRequestSchema.parse(validInput);
      expect(parsed.hoursWorked).toBe(8);
      expect(parsed.reason).toBe('Projeto urgente com cliente importante');
    });

    it('rejeita horas extras acima de 24h', () => {
      expect(() =>
        overtimeRequestSchema.parse({
          ...validInput,
          hoursWorked: 25,
        })
      ).toThrow();
    });

    it('rejeita horas extras negativas', () => {
      expect(() =>
        overtimeRequestSchema.parse({
          ...validInput,
          hoursWorked: -1,
        })
      ).toThrow();
    });

    it('rejeita horas que não são múltiplos de 0.5', () => {
      expect(() =>
        overtimeRequestSchema.parse({
          ...validInput,
          hoursWorked: 7.3,
        })
      ).toThrow();
    });

    it('aceita horas em múltiplos de 0.5', () => {
      const parsed = overtimeRequestSchema.parse({
        ...validInput,
        hoursWorked: 7.5,
      });
      expect(parsed.hoursWorked).toBe(7.5);
    });

    it('rejeita motivo com menos de 10 caracteres', () => {
      expect(() =>
        overtimeRequestSchema.parse({
          ...validInput,
          reason: 'Curto',
        })
      ).toThrow();
    });

    it('aceita sem motivo (opcional)', () => {
      const { reason, ...inputWithoutReason } = validInput;
      const parsed = overtimeRequestSchema.parse(inputWithoutReason);
      expect(parsed.reason).toBeUndefined();
    });
  });

  // ============================================================
  // TESTES DE APROVAÇÃO DE HORAS EXTRAS
  // ============================================================
  describe('overtimeApprovalSchema', () => {
    const validInput = {
      overtimeId: '550e8400-e29b-41d4-a716-446655440000',
      approved: true,
      notes: 'Aprovado pelo gestor',
    };

    it('valida aprovação com notas', () => {
      const parsed = overtimeApprovalSchema.parse(validInput);
      expect(parsed.approved).toBe(true);
      expect(parsed.notes).toBe('Aprovado pelo gestor');
    });

    it('rejeita aprovação sem overtimeId válido', () => {
      expect(() =>
        overtimeApprovalSchema.parse({
          ...validInput,
          overtimeId: '123',
        })
      ).toThrow();
    });

    it('rejeita rejeição sem motivo', () => {
      expect(() =>
        overtimeApprovalSchema.parse({
          overtimeId: '550e8400-e29b-41d4-a716-446655440000',
          approved: false,
        })
      ).toThrow();
    });

    it('aceita rejeição com motivo', () => {
      const parsed = overtimeApprovalSchema.parse({
        overtimeId: '550e8400-e29b-41d4-a716-446655440000',
        approved: false,
        rejectionReason: 'Limite de horas extras excedido este mês',
      });
      expect(parsed.approved).toBe(false);
      expect(parsed.rejectionReason).toBe('Limite de horas extras excedido este mês');
    });

    it('rejeita motivo de rejeição com menos de 10 caracteres', () => {
      expect(() =>
        overtimeApprovalSchema.parse({
          overtimeId: '550e8400-e29b-41d4-a716-446655440000',
          approved: false,
          rejectionReason: 'Curto',
        })
      ).toThrow();
    });
  });

  // ============================================================
  // TESTES DE CÁLCULO DE HORAS EXTRAS
  // ============================================================
  describe('overtimeCalculationSchema', () => {
    it('calcula corretamente horas extras a 50%', () => {
      const input = {
        type: '50%' as const,
        hoursWorked: 8,
        hourlyRate: 100,
      };
      const parsed = overtimeCalculationSchema.parse(input);
      expect(parsed.multiplier).toBe(1.5);
      expect(parsed.totalValue).toBe(1200); // 8 * 100 * 1.5
    });

    it('calcula corretamente horas extras a 100%', () => {
      const input = {
        type: '100%' as const,
        hoursWorked: 8,
        hourlyRate: 100,
      };
      const parsed = overtimeCalculationSchema.parse(input);
      expect(parsed.multiplier).toBe(2);
      expect(parsed.totalValue).toBe(1600); // 8 * 100 * 2
    });

    it('calcula corretamente horas extras noturnas', () => {
      const input = {
        type: 'NOTURNO' as const,
        hoursWorked: 8,
        hourlyRate: 100,
      };
      const parsed = overtimeCalculationSchema.parse(input);
      expect(parsed.multiplier).toBe(1.2);
      expect(parsed.totalValue).toBe(960); // 8 * 100 * 1.2
    });

    it('rejeita tipo de hora extra inválido', () => {
      expect(() =>
        overtimeCalculationSchema.parse({
          type: 'INVALIDO',
          hoursWorked: 8,
          hourlyRate: 100,
        })
      ).toThrow();
    });

    it('rejeita horas negativas', () => {
      expect(() =>
        overtimeCalculationSchema.parse({
          type: '50%',
          hoursWorked: -5,
          hourlyRate: 100,
        })
      ).toThrow();
    });

    it('rejeita taxa horária zero', () => {
      expect(() =>
        overtimeCalculationSchema.parse({
          type: '50%',
          hoursWorked: 8,
          hourlyRate: 0,
        })
      ).toThrow();
    });
  });
});
