import { isBusinessDay } from '@fincheck/shared/common/date/is-business-day.util.ts';
import { shiftToBusinessDay } from '@fincheck/shared/common/date/shift-to-business-day.util.ts';

import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// Which days the banks work. Monday to Friday, except the national holidays, which are computed (the
// fixed ones and the ones that follow Easter), with no table and no API. Carnival (Monday and
// Tuesday), Good Friday and Corpus Christi count as non-business days, as in the bank calendar.
export class BusinessCalendar {
  isBusinessDay(date: BusinessDate): boolean {
    return isBusinessDay(date.value);
  }

  // The nth business day of a month (the 5th business day of November 2026 is 09/11).
  nthBusinessDay(month: Month, n: number): BusinessDate {
    if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be an integer >= 1');

    let current = month.firstDay();
    const last = month.lastDay();
    let count = 0;
    while (!last.isBefore(current)) {
      if (this.isBusinessDay(current)) count++;
      if (count === n) return current;
      current = current.addDays(1);
    }

    throw new RangeError(`${month.value} has fewer than ${String(n)} business days`);
  }

  // The date itself when it is a business day; otherwise the first business day after it. Crosses
  // into the next month or year when needed.
  nextBusinessDay(date: BusinessDate): BusinessDate {
    return BusinessDate.of(shiftToBusinessDay(date.value, 'after'));
  }

  // The date itself when it is a business day; otherwise the closest business day before it.
  previousBusinessDay(date: BusinessDate): BusinessDate {
    return BusinessDate.of(shiftToBusinessDay(date.value, 'before'));
  }
}
