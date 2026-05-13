/**
 * Engine de jornada — avalia um time_record contra a regra do contrato.
 * Retorna decomposição: horas esperadas vs trabalhadas, atraso,
 * horas extras (50%/100%/noturno) e movimento de banco de horas.
 */

import * as db from "../db.js";

export interface ScheduleRule {
  scheduleType: string;
  workDays: number[]; // 0=domingo, 6=sábado
  startTime: string; // "HH:mm"
  endTime: string;
  lunchBreakMinutes: number;
  toleranceMinutes: number;
  hourBankEnabled: boolean;
  nightShiftEnabled: boolean;
}

export interface ClockEvaluation {
  expectedMinutes: number;
  workedMinutes: number;
  delayMinutes: number;
  isWorkday: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  overtime: {
    type50: number; // overtime diurno (50%)
    type100: number; // domingo + feriado (100%)
    typeNight: number; // adicional noturno 22:00–05:00 (20%)
    total: number;
  };
  hourBank: {
    credit: number; // minutos para somar ao banco
    debit: number; // minutos para subtrair do banco
  };
  notes: string[];
}

const NIGHT_START = 22 * 60; // minutos desde 00:00
const NIGHT_END = 5 * 60;
const MS_PER_MIN = 60 * 1000;

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

function isoDate(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function nightShiftOverlap(clockIn: Date, clockOut: Date): number {
  const start = clockIn.getTime();
  const end = clockOut.getTime();
  let overlapMs = 0;
  const cursor = new Date(clockIn);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end) {
    const dayStart = cursor.getTime();
    const nightAStart = dayStart + NIGHT_START * MS_PER_MIN;
    const nightAEnd = dayStart + 24 * 60 * MS_PER_MIN;
    const nightBStart = dayStart;
    const nightBEnd = dayStart + NIGHT_END * MS_PER_MIN;
    overlapMs += Math.max(0, Math.min(end, nightAEnd) - Math.max(start, nightAStart));
    overlapMs += Math.max(0, Math.min(end, nightBEnd) - Math.max(start, nightBStart));
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.floor(overlapMs / MS_PER_MIN);
}

async function isHolidayDate(date: Date): Promise<boolean> {
  const all = (await db.listHolidays()) as Array<{ date: string | Date; recurring: boolean }>;
  const target = isoDate(date);
  for (const h of all) {
    const hd = new Date(h.date);
    if (h.recurring) {
      if (hd.getMonth() === date.getMonth() && hd.getDate() === date.getDate()) return true;
    } else {
      if (isoDate(hd) === target) return true;
    }
  }
  return false;
}

export async function evaluateClockRecord(opts: {
  clockIn: Date;
  clockOut: Date;
  rule: ScheduleRule;
}): Promise<ClockEvaluation> {
  const { clockIn, clockOut, rule } = opts;
  const notes: string[] = [];

  if (clockOut.getTime() <= clockIn.getTime()) {
    return emptyEvaluation(["Saída anterior à entrada"]);
  }

  const dayOfWeek = clockIn.getDay();
  const isHoliday = await isHolidayDate(clockIn);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isScheduledDay = rule.workDays.includes(dayOfWeek);
  const isWorkday = isScheduledDay && !isHoliday;

  const expectedDailyMinutes = isWorkday
    ? Math.max(0, parseHHMM(rule.endTime) - parseHHMM(rule.startTime) - (rule.lunchBreakMinutes || 0))
    : 0;

  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / MS_PER_MIN);
  const workedMinutes = Math.max(0, totalMinutes - (isWorkday ? rule.lunchBreakMinutes : 0));

  // Atraso: comparar clockIn vs startTime no dia (com tolerância)
  let delayMinutes = 0;
  if (isWorkday) {
    const expectedStart = parseHHMM(rule.startTime);
    const actualStart = clockIn.getHours() * 60 + clockIn.getMinutes();
    const delay = actualStart - expectedStart;
    if (delay > rule.toleranceMinutes) {
      delayMinutes = delay;
      notes.push(`Atraso de ${delay} minutos (entrada ${String(clockIn.getHours()).padStart(2, "0")}:${String(clockIn.getMinutes()).padStart(2, "0")})`);
    }
  }

  // Horas extras
  let type50 = 0;
  let type100 = 0;
  let typeNight = 0;

  if (!isWorkday && (isHoliday || dayOfWeek === 0)) {
    // Domingo ou feriado: 100%
    type100 = workedMinutes;
    if (isHoliday) notes.push("Trabalho em feriado: 100%");
    if (dayOfWeek === 0) notes.push("Trabalho em domingo: 100%");
  } else if (!isWorkday) {
    // Sábado fora da escala: tratar como 50%
    type50 = workedMinutes;
    notes.push("Trabalho fora da escala: 50%");
  } else {
    // Dia útil: extra acima do esperado
    const excess = workedMinutes - expectedDailyMinutes;
    if (excess > rule.toleranceMinutes) {
      type50 = excess;
      notes.push(`${excess} minutos de hora extra acima da jornada`);
    }
  }

  if (rule.nightShiftEnabled) {
    typeNight = nightShiftOverlap(clockIn, clockOut);
    if (typeNight > 0) notes.push(`${typeNight} minutos em horário noturno (22:00–05:00)`);
  }

  const totalOvertime = type50 + type100 + typeNight;

  // Banco de horas
  let hourBankCredit = 0;
  let hourBankDebit = 0;
  if (rule.hourBankEnabled) {
    if (isWorkday) {
      const diff = workedMinutes - expectedDailyMinutes;
      if (diff > rule.toleranceMinutes) hourBankCredit = diff;
      else if (diff < -rule.toleranceMinutes) hourBankDebit = Math.abs(diff);
    }
  }

  return {
    expectedMinutes: expectedDailyMinutes,
    workedMinutes,
    delayMinutes,
    isWorkday,
    isHoliday,
    isWeekend,
    overtime: { type50, type100, typeNight, total: totalOvertime },
    hourBank: { credit: hourBankCredit, debit: hourBankDebit },
    notes,
  };
}

function emptyEvaluation(notes: string[] = []): ClockEvaluation {
  return {
    expectedMinutes: 0,
    workedMinutes: 0,
    delayMinutes: 0,
    isWorkday: false,
    isHoliday: false,
    isWeekend: false,
    overtime: { type50: 0, type100: 0, typeNight: 0, total: 0 },
    hourBank: { credit: 0, debit: 0 },
    notes,
  };
}

export async function getActiveScheduleRule(employeeId: number): Promise<ScheduleRule | null> {
  const list = (await db.listContracts(employeeId)) as any[];
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime());
  const c = sorted[0];
  if (!c) return null;
  return {
    scheduleType: c.scheduleType ?? "5x2",
    workDays: Array.isArray(c.workDays) ? c.workDays : [1, 2, 3, 4, 5],
    startTime: c.startTime ?? "08:00",
    endTime: c.endTime ?? "17:00",
    lunchBreakMinutes: c.lunchBreakMinutes ?? 60,
    toleranceMinutes: c.toleranceMinutes ?? 5,
    hourBankEnabled: !!c.hourBankEnabled,
    nightShiftEnabled: !!c.nightShiftEnabled,
  };
}
