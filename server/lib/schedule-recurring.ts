export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly";

export function buildRecurringDates(
  startDate: Date,
  frequency: RecurrenceFrequency,
  occurrences: number
) {
  const safeOccurrences = Math.max(1, Math.min(occurrences, 52));
  const dates: Date[] = [];

  const y = startDate.getUTCFullYear();
  const m = startDate.getUTCMonth();
  const d = startDate.getUTCDate();

  for (let index = 0; index < safeOccurrences; index += 1) {
    let nextDate: Date;

    if (frequency === "weekly") {
      nextDate = new Date(Date.UTC(y, m, d + index * 7));
    } else if (frequency === "biweekly") {
      nextDate = new Date(Date.UTC(y, m, d + index * 14));
    } else {
      nextDate = new Date(Date.UTC(y, m + index, d));
    }

    dates.push(nextDate);
  }

  return dates;
}
