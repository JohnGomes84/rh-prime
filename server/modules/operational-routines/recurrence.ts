export type RoutineFrequency = "weekly" | "biweekly" | "monthly";

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function clampDayOfMonth(year: number, month: number, day: number): number {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.max(1, Math.min(day, last));
}

function isoWeekRef(date: Date): { year: number; week: number } {
  const d = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dow = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(d.getTime() + (3 - dow) * DAY_MS);
  const year = thursday.getUTCFullYear();
  const jan4 = utcDate(year, 0, 4);
  const jan4Dow = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4.getTime() - jan4Dow * DAY_MS);
  const week = Math.floor((thursday.getTime() - week1Monday.getTime()) / (7 * DAY_MS)) + 1;
  return { year, week };
}

function periodRefForDueDate(frequency: RoutineFrequency, dueDate: Date): string {
  if (frequency === "monthly") {
    return `${dueDate.getUTCFullYear()}-${String(dueDate.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const ref = isoWeekRef(dueDate);
  const prefix = frequency === "biweekly" ? "B" : "W";
  return `${ref.year}-${prefix}${String(ref.week).padStart(2, "0")}`;
}

export interface RecurrenceInput {
  frequency: RoutineFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  generateLeadDays: number;
}

export interface OccurrenceCandidate {
  periodRef: string;
  dueDate: string;
}

export function candidateForDate(input: RecurrenceInput, baseDate = new Date()): OccurrenceCandidate {
  const base = utcDate(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate());
  const lead = Math.max(0, input.generateLeadDays || 0);
  const target = new Date(base.getTime() + lead * DAY_MS);

  let due: Date;
  if (input.frequency === "monthly") {
    const day = input.dayOfMonth ?? 1;
    due = utcDate(target.getUTCFullYear(), target.getUTCMonth(), clampDayOfMonth(target.getUTCFullYear(), target.getUTCMonth(), day));
    if (due.getTime() < base.getTime()) {
      const nextMonth = target.getUTCMonth() === 11 ? 0 : target.getUTCMonth() + 1;
      const nextYear = target.getUTCMonth() === 11 ? target.getUTCFullYear() + 1 : target.getUTCFullYear();
      due = utcDate(nextYear, nextMonth, clampDayOfMonth(nextYear, nextMonth, day));
    }
  } else {
    const desiredDow = input.dayOfWeek ?? 5;
    const currentDow = base.getUTCDay();
    let daysAhead = (desiredDow - currentDow + 7) % 7;
    if (daysAhead > lead) daysAhead += 7;
    due = new Date(base.getTime() + daysAhead * DAY_MS);
    if (input.frequency === "biweekly") {
      const ref = isoWeekRef(due);
      if (ref.week % 2 !== 0) due = new Date(due.getTime() + 7 * DAY_MS);
    }
  }

  return {
    periodRef: periodRefForDueDate(input.frequency, due),
    dueDate: due.toISOString().slice(0, 10),
  };
}

export function reminderKey(daysBefore: number, dueDate: string): string {
  return daysBefore < 0 ? `overdue:${dueDate}` : `d-${daysBefore}:${dueDate}`;
}

export function daysUntil(dueDate: string, baseDate = new Date()): number {
  const base = utcDate(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate());
  const due = new Date(`${dueDate}T00:00:00Z`);
  return Math.round((due.getTime() - base.getTime()) / DAY_MS);
}
