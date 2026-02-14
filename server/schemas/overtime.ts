import { z } from 'zod';

/**
 * Schema para validação de clock-in/clock-out
 * Aceita employeeId e timestamp opcional
 */
export const clockInSchema = z.object({
  employeeId: z.string().uuid('employeeId deve ser um UUID válido'),
  timestamp: z.date().optional().default(() => new Date()),
});

export type ClockInInput = z.infer<typeof clockInSchema>;

/**
 * Schema para validação de solicitação de horas extras
 * Valida employeeId, data, horas trabalhadas e motivo
 */
export const overtimeRequestSchema = z.object({
  employeeId: z.string().uuid('employeeId deve ser um UUID válido'),
  date: z.date('data é obrigatória'),
  hoursWorked: z.number()
    .min(0.5, 'Mínimo 0.5 horas')
    .max(24, 'Máximo 24 horas por dia')
    .refine((val) => val % 0.5 === 0, 'Horas devem ser múltiplos de 0.5'),
  reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres').optional(),
});

export type OvertimeRequestInput = z.infer<typeof overtimeRequestSchema>;

/**
 * Schema para validação de aprovação de horas extras
 * Valida ID da solicitação, status de aprovação e notas
 */
export const overtimeApprovalSchema = z.object({
  overtimeId: z.string().uuid('overtimeId deve ser um UUID válido'),
  approved: z.boolean('approved deve ser true ou false'),
  notes: z.string().min(5, 'Notas devem ter no mínimo 5 caracteres').optional(),
  rejectionReason: z.string().min(10, 'Motivo da rejeição deve ter no mínimo 10 caracteres').optional(),
}).refine(
  (data) => {
    // Se rejeitado, deve ter motivo
    if (!data.approved && !data.rejectionReason) {
      return false;
    }
    return true;
  },
  {
    message: 'Motivo de rejeição é obrigatório quando rejeitado',
    path: ['rejectionReason'],
  }
);

export type OvertimeApprovalInput = z.infer<typeof overtimeApprovalSchema>;

/**
 * Schema para validação de cálculo de horas extras
 * Calcula multiplicador baseado no tipo de hora extra
 */
export const overtimeCalculationSchema = z.object({
  type: z.enum(['50%', '100%', 'NOTURNO'], {
    errorMap: () => ({ message: 'Tipo deve ser 50%, 100% ou NOTURNO' }),
  }),
  hoursWorked: z.number().positive('Horas deve ser positivo'),
  hourlyRate: z.number().positive('Taxa horária deve ser positiva'),
}).transform((data) => {
  let multiplier = 1;
  if (data.type === '50%') multiplier = 1.5;
  if (data.type === '100%') multiplier = 2;
  if (data.type === 'NOTURNO') multiplier = 1.2;

  return {
    ...data,
    multiplier,
    totalValue: data.hoursWorked * data.hourlyRate * multiplier,
  };
});

export type OvertimeCalculationInput = z.infer<typeof overtimeCalculationSchema>;
