/**
 * Serviço de Cálculo de Folha de Pagamento
 * Conformidade CLT com INSS, IR, FGTS
 * Tabelas atualizadas para 2026
 */

export interface PayrollInput {
  baseSalary: number;
  allowances?: number;
  bonuses?: number;
  otherDeductions?: number;
  dependents?: number;
  overtimeHours?: number;
  overtimeType?: '50%' | '100%' | 'NOTURNO';
}

export interface PayrollOutput {
  baseSalary: number;
  allowances: number;
  bonuses: number;
  overtimeValue: number;
  grossSalary: number;
  inss: number;
  ir: number;
  fgts: number;
  otherDeductions: number;
  netSalary: number;
  details: {
    inssRate: number;
    irRate: number;
    fgtsRate: number;
    overtimeHours?: number;
    overtimeType?: string;
  };
}

// Tabelas 2026
const INSS_RATES_2026 = [
  { min: 0, max: 1412.00, rate: 0.075 },
  { min: 1412.01, max: 2666.68, rate: 0.09 },
  { min: 2666.69, max: 4000.03, rate: 0.12 },
  { min: 4000.04, max: 7786.02, rate: 0.14 },
];

const INSS_CEILING_2026 = 7786.02;
const INSS_MAX_DISCOUNT_2026 = 1090.44;

// Tabela de IR 2026 - Receita Federal (vigente desde janeiro de 2026)
const IR_RATES_2026 = [
  { min: 0, max: 2428.80, rate: 0, deduction: 0 },
  { min: 2428.81, max: 2826.65, rate: 0.075, deduction: 182.16 },
  { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 394.16 },
  { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 675.49 },
  { min: 4664.69, max: Infinity, rate: 0.275, deduction: 908.73 },
];



const FGTS_RATE = 0.08;

/**
 * Calcula INSS com progressão de alíquotas
 */
function calculateINSS(baseSalary: number): number {
  if (baseSalary > INSS_CEILING_2026) {
    return INSS_MAX_DISCOUNT_2026;
  }

  let inss = 0;
  for (const bracket of INSS_RATES_2026) {
    if (baseSalary <= bracket.min) break;

    const taxableAmount = Math.min(baseSalary, bracket.max) - bracket.min;
    inss += taxableAmount * bracket.rate;
  }

  return Math.round(inss * 100) / 100;
}

/**
 * Calcula IR com deduções por dependente
 */
function calculateIR(grossSalary: number, dependents: number = 0): number {
  // Dedução por dependente: R$ 189,59 em 2026
  const dependentDeduction = dependents * 189.59;
  const taxableBase = grossSalary - dependentDeduction;

  if (taxableBase <= 0) return 0;

  // Encontra o bracket aplicável (maior min que seja <= taxableBase)
  const applicableBracket = IR_RATES_2026.findLast(
    (b) => taxableBase >= b.min
  );

  if (!applicableBracket || applicableBracket.rate === 0) {
    return 0;
  }

  // Calcula IR: (base * alíquota) - dedução
  // A dedução já inclui o efeito da alíquota anterior
  const ir = taxableBase * applicableBracket.rate - applicableBracket.deduction;

  return Math.max(0, Math.round(ir * 100) / 100);
}

/**
 * Calcula FGTS
 */
function calculateFGTS(baseSalary: number): number {
  return Math.round(baseSalary * FGTS_RATE * 100) / 100;
}

/**
 * Calcula folha de pagamento completa
 */
export function calculatePayroll(input: PayrollInput): PayrollOutput {
  const allowances = input.allowances || 0;
  const bonuses = input.bonuses || 0;
  const otherDeductions = input.otherDeductions || 0;
  const dependents = input.dependents || 0;
  const overtimeHours = input.overtimeHours || 0;
  const overtimeType = input.overtimeType || '100%';

  const hourlyRate = input.baseSalary / 220;
  const overtimeMultipliers: Record<string, number> = {
    '50%': 1.5,
    '100%': 2.0,
    'NOTURNO': 1.2,
  };
  const overtimeValue = overtimeHours * hourlyRate * overtimeMultipliers[overtimeType];

  const grossSalary = input.baseSalary + allowances + bonuses + overtimeValue;

  const inss = calculateINSS(input.baseSalary);
  const ir = calculateIR(grossSalary, dependents);
  const fgts = calculateFGTS(input.baseSalary);

  const netSalary = grossSalary - inss - ir - otherDeductions;

  return {
    baseSalary: input.baseSalary,
    allowances,
    bonuses,
    overtimeValue: Math.round(overtimeValue * 100) / 100,
    grossSalary: Math.round(grossSalary * 100) / 100,
    inss: Math.round(inss * 100) / 100,
    ir: Math.round(ir * 100) / 100,
    fgts: Math.round(fgts * 100) / 100,
    otherDeductions,
    netSalary: Math.round(netSalary * 100) / 100,
    details: {
      inssRate: 0.14,
      irRate: 0.275,
      fgtsRate: FGTS_RATE,
      overtimeHours,
      overtimeType,
    },
  };
}

/**
 * Valida entrada de folha
 */
export function validatePayrollInput(input: PayrollInput): string[] {
  const errors: string[] = [];

  if (input.baseSalary < 0) {
    errors.push('Salário base não pode ser negativo');
  }

  if ((input.allowances || 0) < 0) {
    errors.push('Adicionais não podem ser negativos');
  }

  if ((input.bonuses || 0) < 0) {
    errors.push('Bônus não podem ser negativos');
  }

  if ((input.dependents || 0) < 0) {
    errors.push('Número de dependentes não pode ser negativo');
  }

  return errors;
}
