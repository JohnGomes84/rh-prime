import { addBusinessDays } from "../../utils/business-days.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function mondayOfIsoWeek(year: number, week: number): Date {
  // 4 de janeiro está sempre na semana ISO 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = (jan4.getUTCDay() + 6) % 7; // segunda = 0
  const week1Monday = new Date(jan4.getTime() - jan4Dow * DAY_MS);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * DAY_MS);
}

/** Sexta-feira (prazo) da semana ISO de um period_ref "YYYY-Www". */
export function fridayOfIsoWeek(periodRef: string): Date {
  const [yStr, wStr] = periodRef.split("-W");
  const monday = mondayOfIsoWeek(Number(yStr), Number(wStr));
  return new Date(monday.getTime() + 4 * DAY_MS);
}

/** period_ref ISO "YYYY-Www" de uma data qualquer. */
export function isoWeekRef(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  // Quinta-feira desta semana define o ano ISO
  const thursday = new Date(d.getTime() + (3 - dow) * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const week1Monday = mondayOfIsoWeek(isoYear, 1);
  const week = Math.floor((thursday.getTime() - week1Monday.getTime()) / (7 * DAY_MS)) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Primeiro dia (UTC) do mês seguinte ao period_ref mensal "YYYY-MM". */
export function firstDayOfNextMonth(periodRef: string): Date {
  const [yStr, mStr] = periodRef.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1-12
  return new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
}

/** period_ref mensal "YYYY-MM" de uma data. */
export function monthRef(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Prazo do relatório:
 * - semanal: sexta-feira da semana ISO;
 * - mensal: 3º dia útil do mês seguinte (2 dias úteis após o 1º dia).
 * Retorna ISO date "YYYY-MM-DD" (coluna `date` do Drizzle).
 */
export async function computeDueDate(cadence: "semanal" | "mensal", periodRef: string): Promise<string> {
  if (cadence === "semanal") {
    return fridayOfIsoWeek(periodRef).toISOString().slice(0, 10);
  }
  const due = await addBusinessDays(firstDayOfNextMonth(periodRef), 2);
  return due.toISOString().slice(0, 10);
}
