import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// How many days an occurrence is late: from its expected day to today (the day after is 1). Zero
// when that day has not passed.
export function computeDaysLate(dueOn: string, today: BusinessDate): number {
  const toTime = (date: BusinessDate) => Date.UTC(date.year, date.monthNumber - 1, date.day);

  return Math.max(0, Math.round((toTime(today) - toTime(BusinessDate.of(dueOn))) / 86_400_000));
}
