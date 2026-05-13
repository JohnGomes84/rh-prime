/**
 * Cálculos trabalhistas BR (CLT).
 * Base: salário bruto mensal. Resultados em reais (number).
 * Valores estimativos — não substituem cálculo oficial do contador.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function diffDays(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY));
}

function diffMonthsCLT(start: Date, end: Date): number {
  // CLT: cada fração de mês ≥ 15 dias conta como mês inteiro
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() - start.getDate() >= 15) months++;
  return Math.max(0, months);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface DecimoTerceiroInput {
  salaryGross: number;
  monthsWorked: number;
}

export function calcDecimoTerceiro(input: DecimoTerceiroInput): {
  proportional: number;
  full: number;
} {
  const months = Math.min(12, Math.max(0, input.monthsWorked));
  return {
    proportional: round2((input.salaryGross / 12) * months),
    full: round2(input.salaryGross),
  };
}

export interface FeriasProporcionaisInput {
  salaryGross: number;
  monthsWorked: number;
}

export function calcFeriasProporcionais(input: FeriasProporcionaisInput): {
  daysAcquired: number;
  vacationValue: number;
  oneThirdBonus: number;
  total: number;
} {
  const months = Math.min(12, Math.max(0, input.monthsWorked));
  const daysAcquired = round2((months * 30) / 12);
  const vacationValue = round2((input.salaryGross / 30) * daysAcquired);
  const oneThirdBonus = round2(vacationValue / 3);
  return {
    daysAcquired,
    vacationValue,
    oneThirdBonus,
    total: round2(vacationValue + oneThirdBonus),
  };
}

export interface RescisaoInput {
  salaryGross: number;
  hireDate: string | Date;
  terminationDate: string | Date;
  /** dias trabalhados no mês da rescisão (saldo de salário) */
  daysWorkedInLastMonth?: number;
  /** Tipo de rescisão. Define direitos. */
  type: "sem_justa_causa" | "pedido_demissao" | "justa_causa" | "fim_contrato_determinado" | "acordo_mutuo";
  /** Saldo FGTS depositado durante o contrato. Se desconhecido, estimado em 8% × salário × meses. */
  fgtsBalance?: number;
  /** dias do aviso prévio (default: indenizado, 30+) */
  noticeDays?: number;
}

export interface RescisaoResult {
  daysWorked: number;
  monthsCLT: number;
  saldoSalario: number;
  avisoPrevio: number;
  decimoTerceiroProporcional: number;
  feriasProporcionais: number;
  oneThirdBonus: number;
  feriasVencidas: number;
  multaFgts: number;
  fgtsBalanceEstimated: number;
  total: number;
  notes: string[];
}

export function calcRescisao(input: RescisaoInput): RescisaoResult {
  const hire = new Date(input.hireDate);
  const term = new Date(input.terminationDate);
  if (isNaN(hire.getTime()) || isNaN(term.getTime())) {
    throw new Error("Datas inválidas");
  }

  const daysWorked = diffDays(hire, term);
  const monthsCLT = diffMonthsCLT(hire, term);
  const monthsThisYear = (() => {
    const yearStart = new Date(term.getFullYear(), 0, 1);
    const start = hire > yearStart ? hire : yearStart;
    return diffMonthsCLT(start, term);
  })();

  const dailyRate = input.salaryGross / 30;
  const daysInLast = input.daysWorkedInLastMonth ?? Math.min(30, term.getDate());
  const saldoSalario = round2(dailyRate * daysInLast);

  const noticeDays = input.noticeDays ?? Math.min(90, 30 + Math.floor(monthsCLT / 12) * 3);
  const isNoNoticeOwed = input.type === "pedido_demissao" || input.type === "justa_causa";
  const avisoPrevio = isNoNoticeOwed ? 0 : round2(dailyRate * noticeDays);

  const decimo = calcDecimoTerceiro({ salaryGross: input.salaryGross, monthsWorked: monthsThisYear });
  const decimoTerceiroProporcional =
    input.type === "justa_causa" ? 0 : decimo.proportional;

  const proportional = calcFeriasProporcionais({ salaryGross: input.salaryGross, monthsWorked: monthsCLT % 12 });
  const feriasProporcionais = input.type === "justa_causa" ? 0 : proportional.vacationValue;
  const oneThirdBonus = input.type === "justa_causa" ? 0 : proportional.oneThirdBonus;

  // Não computamos férias vencidas automaticamente — depende de histórico.
  const feriasVencidas = 0;

  const fgtsBalanceEstimated =
    input.fgtsBalance ?? round2(input.salaryGross * 0.08 * monthsCLT);

  let multaFgts = 0;
  if (input.type === "sem_justa_causa") multaFgts = round2(fgtsBalanceEstimated * 0.4);
  else if (input.type === "acordo_mutuo") multaFgts = round2(fgtsBalanceEstimated * 0.2);

  const total = round2(
    saldoSalario +
      avisoPrevio +
      decimoTerceiroProporcional +
      feriasProporcionais +
      oneThirdBonus +
      feriasVencidas +
      multaFgts
  );

  const notes: string[] = [];
  if (input.type === "justa_causa") notes.push("Justa causa: sem aviso prévio, 13º proporcional, férias proporcionais ou multa FGTS.");
  if (input.type === "pedido_demissao") notes.push("Pedido de demissão: sem aviso prévio nem multa FGTS.");
  if (input.type === "acordo_mutuo") notes.push("Acordo mútuo: aviso 50%, multa FGTS 20%, saque limitado a 80%.");
  if (input.fgtsBalance === undefined) notes.push("Saldo FGTS estimado em 8% × salário × meses (informe o saldo real para precisão).");

  return {
    daysWorked,
    monthsCLT,
    saldoSalario,
    avisoPrevio,
    decimoTerceiroProporcional,
    feriasProporcionais,
    oneThirdBonus,
    feriasVencidas,
    multaFgts,
    fgtsBalanceEstimated,
    total,
    notes,
  };
}
