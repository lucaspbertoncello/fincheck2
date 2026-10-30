import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { isBusinessDay } from '#mocks/support/dates/is-business-day.util.ts';

// The date itself when it is a business day, otherwise the next one.
export function nextBusinessDay(date: string): string {
  let current = date;
  while (!isBusinessDay(current)) current = addDays(current, 1);

  return current;
}
