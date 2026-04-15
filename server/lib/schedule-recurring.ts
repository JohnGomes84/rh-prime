export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly";

export function buildRecurringDates(
  startDate: Date,
  frequency: RecurrenceFrequency,
  occurrences: number
) {
  const safeOccurrences = Math.max(1, Math.min(occurrences, 52));
  const dates: Date[] = [];

  for (let index = 0; index < safeOccurrences; index += 1) {
    const nextDate = new Date(startDate);

    if (frequency === "weekly") {
      nextDate.setDate(startDate.getDate() + index * 7);
    } else if (frequency === "biweekly") {
      nextDate.setDate(startDate.getDate() + index * 14);
    } else {
      nextDate.setMonth(startDate.getMonth() + index);
    }

    dates.push(nextDate);
  }

  return dates;
}
