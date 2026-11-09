import { computeOccurrenceWindow } from '#/modules/recurrences/domain/occurrence/compute-occurrence-window.util.ts';
import type { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// How many months it looks ahead. A fixed day moved back to the previous business day can land
// before today even in the next month (the 1st of a month that starts on a weekend), so the
// answer may be two months away; three is the safe bound.
const MONTHS_AHEAD = 3;

// The next day an income is expected, today or later (the profile, `nextExpectedOn`): the
// expected day of the rule in the current month if it is not behind us, otherwise the next
// month's. It is the same `expectedOn` of an occurrence (`computeOccurrenceWindow`), so the
// profile and the recurrences never disagree. A recurrence that starts later waits for its first
// month. `null` when the rule has no day ("any day" with no likely one). Pure.
export function computeNextExpectedOn(
  rule: DateRule,
  startsMonth: Month,
  today: BusinessDate,
  calendar: BusinessCalendar,
): BusinessDate | null {
  const current = Month.containing(today);
  let month = startsMonth.value > current.value ? startsMonth : current;

  for (let step = 0; step < MONTHS_AHEAD; step++) {
    const { expectedOn } = computeOccurrenceWindow(rule, month, calendar);
    if (expectedOn === null) return null;
    if (!expectedOn.isBefore(today)) return expectedOn;
    month = month.next();
  }

  return null;
}
