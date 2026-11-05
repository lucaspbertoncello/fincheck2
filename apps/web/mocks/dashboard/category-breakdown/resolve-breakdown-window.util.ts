import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';

import { computePeriod } from '#mocks/dashboard/month-summary/compute-period.util.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { daysBetween } from '#mocks/support/dates/days-between.util.ts';

export interface BreakdownWindow {
  month: string | null;
  fromOn: string;
  untilOn: string;
  // The period it is compared with; null over all the history.
  previous: { fromOn: string; untilOn: string } | null;
  comparedUntilOn: string | null;
  // Only a month has recurrences that still expect money.
  hasExpectation: boolean;
}

const EVERYTHING = { fromOn: '0000-01-01', untilOn: '9999-12-31' } as const;

// The windows a read of the categories compares: a month (day 1 to the same day before, as the
// overview does), a free period (against the period of the same size right before), or all of it.
export function resolveBreakdownWindow(query: CategoryBreakdown.Query): BreakdownWindow {
  if (query.month) {
    const period = computePeriod(query.month);

    return {
      month: query.month,
      fromOn: period.fromOn,
      untilOn: period.asOfOn,
      previous: { fromOn: period.previousFromOn, untilOn: period.previousUntilOn },
      comparedUntilOn: period.asOfOn,
      hasExpectation: true,
    };
  }
  if (query.from && query.to) {
    const days = daysBetween(query.from, query.to) + 1;
    const previousUntilOn = addDays(query.from, -1);

    return {
      month: null,
      fromOn: query.from,
      untilOn: query.to,
      previous: { fromOn: addDays(previousUntilOn, -(days - 1)), untilOn: previousUntilOn },
      comparedUntilOn: query.to,
      hasExpectation: false,
    };
  }

  return {
    month: null,
    ...EVERYTHING,
    previous: null,
    comparedUntilOn: null,
    hasExpectation: false,
  };
}
