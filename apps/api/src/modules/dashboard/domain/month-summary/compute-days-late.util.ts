import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// How many days an occurrence is late: from the end of its window to today (the day after the end
// is 1). Zero when the window has not ended.
export function computeDaysLate(windowEndOn: string, today: BusinessDate): number {
  const toTime = (date: BusinessDate) => Date.UTC(date.year, date.monthNumber - 1, date.day);

  return Math.max(
    0,
    Math.round((toTime(today) - toTime(BusinessDate.of(windowEndOn))) / 86_400_000),
  );
}
