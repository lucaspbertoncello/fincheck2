import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';

interface Period {
  month: string;
  previousMonth: string;
  fromOn: string;
  // Today in the current month, the last day in a past month, the first day in a future one.
  asOfOn: string;
  previousFromOn: string;
  // The same day in the previous month (held at its last day when it is shorter); in a past month,
  // its last day.
  previousUntilOn: string;
}

// The two windows a month is compared on: day 1 to `asOfOn` against day 1 to the same point of the
// month before (the same day number in the current month; the whole month in a past one).
export function computePeriod(month: string): Period {
  const previousMonth = addMonths(month, -1);
  let asOfOn: string;
  let previousUntilOn: string;
  if (month === CURRENT_MONTH) {
    asOfOn = TODAY;
    previousUntilOn = dateInMonth(previousMonth, dayOf(TODAY));
  } else if (month < CURRENT_MONTH) {
    // A past month is compared as a whole against the whole month before.
    asOfOn = dateInMonth(month, daysInMonth(month));
    previousUntilOn = dateInMonth(previousMonth, daysInMonth(previousMonth));
  } else {
    asOfOn = `${month}-01`;
    previousUntilOn = `${previousMonth}-01`;
  }

  return {
    month,
    previousMonth,
    fromOn: `${month}-01`,
    asOfOn,
    previousFromOn: `${previousMonth}-01`,
    previousUntilOn,
  };
}
