import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { nthBusinessDay } from '#mocks/support/dates/nth-business-day.util.ts';

interface OccurrenceWindow {
  expectedOn: string | null;
  windowStartOn: string;
  windowEndOn: string;
}

// The expected day and the matching window of a date rule in a month (recurrences.md, "Janela").
export function computeOccurrenceWindow(
  rule: Recurrence.DateRule,
  month: string,
): OccurrenceWindow {
  const firstDay = `${month}-01`;
  const lastDay = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;

  switch (rule.type) {
    case 'fixed_day': {
      const expectedOn = dateInMonth(month, rule.day ?? 1);
      return {
        expectedOn,
        windowStartOn: addDays(expectedOn, -3),
        windowEndOn: addDays(expectedOn, 3),
      };
    }
    case 'business_day': {
      const expectedOn = nthBusinessDay(month, rule.businessDayNumber ?? 1);
      return { expectedOn, windowStartOn: firstDay, windowEndOn: addDays(expectedOn, 3) };
    }
    case 'around_day': {
      const expectedOn = dateInMonth(month, rule.day ?? 1);
      const tolerance = rule.toleranceDays ?? 0;
      return {
        expectedOn,
        windowStartOn: addDays(expectedOn, -tolerance),
        windowEndOn: addDays(expectedOn, tolerance),
      };
    }
    case 'any_day':
      return {
        expectedOn: rule.day === null ? null : dateInMonth(month, rule.day),
        windowStartOn: firstDay,
        windowEndOn: lastDay,
      };
  }
}
