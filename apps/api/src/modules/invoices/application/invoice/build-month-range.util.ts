import type { Month } from '#/shared/date/month.value-object.ts';

// Every month from `from` to `to`, inclusive, oldest first. Empty when `from` is after `to`.
export function buildMonthRange(from: Month, to: Month): Month[] {
  const months: Month[] = [];
  for (let month = from; month.value <= to.value; month = month.next()) months.push(month);

  return months;
}
