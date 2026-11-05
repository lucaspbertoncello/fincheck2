import { addDays } from '#/common/date/add-days.util.ts';
import { isBusinessDay } from '#/common/date/is-business-day.util.ts';

// The date itself when it is a business day; otherwise the closest business day before it
// (`before`) or after it (`after`), crossing into the next or previous month or year if needed.
export function shiftToBusinessDay(date: string, direction: 'before' | 'after'): string {
  const step = direction === 'before' ? -1 : 1;
  let current = date;
  while (!isBusinessDay(current)) current = addDays(current, step);

  return current;
}
