import * as db from "../db.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateAtMidnight(input: string | Date): Date {
  const d = typeof input === "string" ? new Date(input) : new Date(input.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loadHolidaySet(start: Date, end: Date): Promise<Set<string>> {
  const all = (await db.listHolidays()) as Array<{ date: string | Date; recurring: boolean }>;
  const minYear = start.getFullYear();
  const maxYear = end.getFullYear();
  const set = new Set<string>();
  for (const h of all) {
    const hd = parseDateAtMidnight(h.date as any);
    if (h.recurring) {
      for (let y = minYear; y <= maxYear; y++) {
        const expanded = new Date(y, hd.getMonth(), hd.getDate());
        set.add(isoDate(expanded));
      }
    } else {
      set.add(isoDate(hd));
    }
  }
  return set;
}

export async function countBusinessDays(startInput: string | Date, endInput: string | Date): Promise<number> {
  const start = parseDateAtMidnight(startInput);
  const end = parseDateAtMidnight(endInput);
  if (end.getTime() < start.getTime()) return 0;
  const holidaySet = await loadHolidaySet(start, end);
  let count = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
    const d = new Date(t);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    if (holidaySet.has(isoDate(d))) continue;
    count++;
  }
  return count;
}

export async function addBusinessDays(startInput: string | Date, businessDays: number): Promise<Date> {
  let d = parseDateAtMidnight(startInput);
  if (businessDays === 0) return d;
  const direction = businessDays > 0 ? 1 : -1;
  let remaining = Math.abs(businessDays);

  const probe = new Date(d.getTime());
  probe.setDate(probe.getDate() + direction * (remaining + 30));
  const [start, end] = direction > 0 ? [d, probe] : [probe, d];
  const holidaySet = await loadHolidaySet(start, end);

  while (remaining > 0) {
    d.setDate(d.getDate() + direction);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    if (holidaySet.has(isoDate(d))) continue;
    remaining--;
  }
  return d;
}

export async function isBusinessDay(input: string | Date): Promise<boolean> {
  const d = parseDateAtMidnight(input);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const set = await loadHolidaySet(d, d);
  return !set.has(isoDate(d));
}
