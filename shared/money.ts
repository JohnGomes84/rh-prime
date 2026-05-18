/**
 * Cálculos financeiros do FinHub — single source of truth, compartilhado client + server.
 *
 * Regra cristalizada (2026-04-25):
 *   Vale (voucher) e marmita (mealAllowance) são adiantamentos descontados da diária.
 *   Bônus soma. Fórmula: total = (dias × diária) − marmita − vale + bônus
 *
 * Banido nesse domínio: parseFloat solto em outros arquivos, replicação de fórmula.
 */

export type MoneyInput = number | string | null | undefined;

/** Converte string decimal/number em number; NaN-safe (retorna 0). */
export function stringToDecimal(value: MoneyInput): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Converte number em string decimal de 2 casas (compatível com decimal(_,2) MySQL). */
export function decimalToString(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

/** Soma N valores monetários e retorna string decimal de 2 casas. */
export function sumMoney(...values: MoneyInput[]): string {
  return decimalToString(values.reduce<number>((acc, v) => acc + stringToDecimal(v), 0));
}

/**
 * Calcula líquido a pagar para uma alocação ou agregado.
 * Retorna string decimal de 2 casas para uso direto em colunas decimal(_,2).
 */
export function computeAllocationNet(params: {
  days: number;
  dailyRate: MoneyInput;
  mealAllowance?: MoneyInput;
  voucher?: MoneyInput;
  bonus?: MoneyInput;
}): string {
  const days = Number.isFinite(params.days) && params.days > 0 ? params.days : 1;
  const base = days * stringToDecimal(params.dailyRate);
  const meal = stringToDecimal(params.mealAllowance);
  const voucher = stringToDecimal(params.voucher);
  const bonus = stringToDecimal(params.bonus);
  return decimalToString(base - meal - voucher + bonus);
}

/** Variante number-only para UI (gráficos, totalizadores). */
export function computeAllocationNetNumber(params: {
  days: number;
  dailyRate: MoneyInput;
  mealAllowance?: MoneyInput;
  voucher?: MoneyInput;
  bonus?: MoneyInput;
}): number {
  return stringToDecimal(computeAllocationNet(params));
}

/** Formata número como BRL (R$ 1.234,56). Aceita string|number. */
export function formatBRL(value: MoneyInput): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(stringToDecimal(value));
}
