import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { isBusinessDay } from '#mocks/support/dates/is-business-day.util.ts';

// The n-th business day (1-based) of a month (`YYYY-MM`).
export function nthBusinessDay(month: string, n: number): string {
  let current = `${month}-01`;
  let found = isBusinessDay(current) ? 1 : 0;
  while (found < n) {
    current = addDays(current, 1);
    if (isBusinessDay(current)) found += 1;
  }

  return current;
}
