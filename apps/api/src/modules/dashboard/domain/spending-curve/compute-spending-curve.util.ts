import type { SpendingCurve } from '@fincheck/shared/dashboard/spending-curve/spending-curve.type.ts';

import { computeLastDayShown } from '#/modules/dashboard/domain/spending-curve/compute-last-day-shown.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { daysInMonth } from '#/shared/date/days-in-month.util.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The spending of the month by day, accumulated, against the month before (BR-DSH-001, 004).
// `lines` are the spending of both months, by competence, with the sign of spending (a refund is
// negative). The month asked shows nothing after today (null; a future month shows nothing at
// all); the month before shows nothing on the days it does not have (31 against a month of 30).
export function computeSpendingCurve(input: {
  month: Month;
  today: BusinessDate;
  lines: { on: string; cents: number }[];
}): SpendingCurve.Dto {
  const previousMonth = input.month.previous();
  const perDay = new Map<string, number>();
  for (const line of input.lines) perDay.set(line.on, (perDay.get(line.on) ?? 0) + line.cents);

  const lastDayWithData = computeLastDayShown(input.month, input.today);
  const previousDays = daysInMonth(previousMonth.year, previousMonth.monthNumber);
  const dayOf = (month: Month, day: number) => `${month.value}-${String(day).padStart(2, '0')}`;

  let current = 0;
  let previous = 0;

  return {
    month: input.month.value,
    previousMonth: previousMonth.value,
    days: Array.from(
      { length: daysInMonth(input.month.year, input.month.monthNumber) },
      (_, index) => {
        const day = index + 1;
        current += perDay.get(dayOf(input.month, day)) ?? 0;
        previous += day <= previousDays ? (perDay.get(dayOf(previousMonth, day)) ?? 0) : 0;

        return {
          day,
          currentCents: day <= lastDayWithData ? current : null,
          previousCents: day <= previousDays ? previous : null,
        };
      },
    ),
  };
}
