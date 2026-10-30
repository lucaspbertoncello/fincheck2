import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/clock.constant.ts';
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
  // The same day in the previous month (held at its last day when it is shorter).
  previousUntilOn: string;
}

// The two windows a month is compared on: day 1 to `asOfOn` against day 1 to the same day before.
export function computePeriod(month: string): Period {
  const previousMonth = addMonths(month, -1);
  let asOfOn: string;
  if (month === CURRENT_MONTH) asOfOn = TODAY;
  else if (month < CURRENT_MONTH) asOfOn = dateInMonth(month, daysInMonth(month));
  else asOfOn = `${month}-01`;

  return {
    month,
    previousMonth,
    fromOn: `${month}-01`,
    asOfOn,
    previousFromOn: `${previousMonth}-01`,
    previousUntilOn: dateInMonth(previousMonth, dayOf(asOfOn)),
  };
}
