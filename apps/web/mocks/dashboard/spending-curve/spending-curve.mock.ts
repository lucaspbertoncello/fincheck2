import { monthQuerySchema } from '@fincheck/shared/common/date/date.schema.ts';
import { spendingCurveDtoSchema } from '@fincheck/shared/dashboard/spending-curve/spending-curve.schema.ts';
import { http } from 'msw';

import { computePeriod } from '#mocks/dashboard/month-summary/compute-period.util.ts';
import { sumLines } from '#mocks/dashboard/month-summary/sum-lines.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { buildLines } from '#mocks/transactions/transaction/build-lines.util.ts';

const dayDate = (month: string, day: number) => `${month}-${String(day).padStart(2, '0')}`;

export const spendingCurveMock = [
  http.get(
    '/api/dashboard/spending-curve',
    handleRoute({ query: monthQuerySchema, response: spendingCurveDtoSchema }, ({ query }) => {
      const period = computePeriod(query.month);
      const lines = buildLines(db);
      const lastWithData =
        query.month === CURRENT_MONTH
          ? dayOf(TODAY)
          : query.month < CURRENT_MONTH
            ? daysInMonth(query.month)
            : 0;
      const previousDays = daysInMonth(period.previousMonth);

      return {
        month: query.month,
        previousMonth: period.previousMonth,
        days: Array.from({ length: daysInMonth(query.month) }, (_, index) => {
          const day = index + 1;

          return {
            day,
            // Cumulative spending until that day; nothing after today.
            currentCents:
              day <= lastWithData
                ? sumLines(lines, 'expense', period.fromOn, dayDate(query.month, day))
                : null,
            previousCents:
              day <= previousDays
                ? sumLines(
                    lines,
                    'expense',
                    period.previousFromOn,
                    dayDate(period.previousMonth, day),
                  )
                : null,
          };
        }),
      };
    }),
  ),
];
