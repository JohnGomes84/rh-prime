/**
 * Regras de validação de férias CLT (Art. 134, 135, 143).
 * Valores e limites conforme a Reforma Trabalhista (Lei 13.467/2017).
 */

export interface VacationRequestInput {
  /** Total de dias de direito no período aquisitivo (normalmente 30). */
  daysEntitled: number;
  /** Dias já gozados / programados no mesmo período aquisitivo. */
  daysTaken: number;
  /** Frações de férias já existentes no período. */
  existingPeriods: Array<{ days: number }>;
  /** Data de início solicitada (ISO yyyy-MM-dd). */
  startDate: string;
  /** Data de término solicitada (ISO yyyy-MM-dd). */
  endDate: string;
  /** Dias de gozo solicitados nesta fração. */
  days: number;
  /** Dias de abono pecuniário solicitados. */
  abonoDays: number;
}

export interface VacationValidationResult {
  valid: boolean;
  errors: string[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Dias corridos (inclusivos) entre duas datas ISO yyyy-MM-dd.
 * Fonte da verdade do servidor para o número de dias de gozo — nunca confiar
 * no valor enviado pelo cliente.
 */
export function calendarDaysBetween(startDate: string, endDate: string): number {
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(endDate + 'T00:00:00');
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / MS_PER_DAY) + 1);
}

export function validateVacationRequest(
  input: VacationRequestInput,
): VacationValidationResult {
  const errors: string[] = [];

  // 1. Saldo: days + abonoDays não pode exceder o saldo restante.
  const remaining = input.daysEntitled - input.daysTaken;
  if (input.days + input.abonoDays > remaining) {
    errors.push(
      `Solicitação excede o saldo disponível. Saldo restante: ${remaining} dia(s).`,
    );
  }

  // 2. Cada fração deve ter no mínimo 5 dias corridos (CLT Art. 134 §1).
  if (input.days < 5) {
    errors.push(
      'Cada fração de férias deve ter no mínimo 5 dias corridos (CLT Art. 134 §1).',
    );
  }

  // 3. Máximo de 3 frações por período aquisitivo (CLT Art. 134 §1).
  const totalFractions = input.existingPeriods.length + 1;
  if (totalFractions > 3) {
    errors.push(
      'As férias podem ser fracionadas em no máximo 3 períodos (CLT Art. 134 §1).',
    );
  }

  // 4. Pelo menos uma fração (existente ou nova) >= 14 dias (CLT Art. 134 §1).
  const allFractionDays = [
    ...input.existingPeriods.map((p) => p.days),
    input.days,
  ];
  const hasLongFraction = allFractionDays.some((d) => d >= 14);
  if (!hasLongFraction) {
    errors.push(
      'Pelo menos uma fração de férias deve ter no mínimo 14 dias corridos (CLT Art. 134 §1).',
    );
  }

  // 5. Abono pecuniário limitado a 1/3 dos dias de direito (CLT Art. 143).
  const maxAbono = Math.floor(input.daysEntitled / 3);
  if (input.abonoDays > maxAbono) {
    errors.push(
      `Abono pecuniário não pode exceder 1/3 dos dias de direito (máx. ${maxAbono} dias, CLT Art. 143).`,
    );
  }

  // 6. Data de início com pelo menos 30 dias de antecedência (CLT Art. 135).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(input.startDate + 'T00:00:00');
  const daysUntilStart = Math.floor(
    (start.getTime() - today.getTime()) / MS_PER_DAY,
  );
  if (daysUntilStart < 30) {
    errors.push(
      'A data de início deve ter pelo menos 30 dias de antecedência (CLT Art. 135).',
    );
  }

  return { valid: errors.length === 0, errors };
}
