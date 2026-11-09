import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { daysInMonth } from '#/shared/date/days-in-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The two windows a month is compared on (BR-DSH-004): day 1 to `asOfOn` of the month against day 1
// to the same point of the month before. `asOfOn` is today in the current month, the last day in a
// past month and the first day in a future one. In the current month the point before is the same
// day number, held at the last day of the month before when it is shorter (30/03 against February
// goes to 28/02, or 29/02 in a leap year). A past month chosen is compared as a whole against the
// whole month before, however long each is.
export function computeComparisonWindow(
  month: Month,
  today: BusinessDate,
): ComputeComparisonWindow.Window {
  const current = Month.containing(today);
  const previousMonth = month.previous();
  const isCurrentMonth = month.equals(current);

  let asOfOn: BusinessDate;
  let previousUntilOn: BusinessDate;
  if (isCurrentMonth) {
    asOfOn = today;
    previousUntilOn = previousMonth
      .firstDay()
      .addDays(Math.min(today.day, daysInMonth(previousMonth.year, previousMonth.monthNumber)) - 1);
  } else if (month.value < current.value) {
    asOfOn = month.lastDay();
    previousUntilOn = previousMonth.lastDay();
  } else {
    asOfOn = month.firstDay();
    previousUntilOn = previousMonth.firstDay();
  }

  return {
    month,
    previousMonth,
    isCurrentMonth,
    fromOn: month.firstDay(),
    asOfOn,
    previousFromOn: previousMonth.firstDay(),
    previousUntilOn,
  };
}

export namespace ComputeComparisonWindow {
  export type Window = {
    month: Month;
    previousMonth: Month;
    isCurrentMonth: boolean;
    fromOn: BusinessDate;
    asOfOn: BusinessDate;
    previousFromOn: BusinessDate;
    previousUntilOn: BusinessDate;
  };
}
