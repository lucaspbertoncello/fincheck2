import { monthQuerySchema } from '@fincheck/shared/common/date/date.schema.ts';
import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import type { MonthSummary } from '@fincheck/shared/dashboard/month-summary/month-summary.type.ts';
import { http } from 'msw';

import { computeFreeBalance } from '#mocks/dashboard/free-balance/compute-free-balance.util.ts';
import { computePeriod } from '#mocks/dashboard/month-summary/compute-period.util.ts';
import { sumLines } from '#mocks/dashboard/month-summary/sum-lines.util.ts';
import { listMonthOccurrences } from '#mocks/recurrences/occurrence/list-month-occurrences.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { daysBetween } from '#mocks/support/dates/days-between.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { isConnectionStale } from '#mocks/sync/connection/is-connection-stale.util.ts';
import { buildLines } from '#mocks/transactions/transaction/build-lines.util.ts';

const roundOne = (value: number) => Math.round(value * 10) / 10;

export const monthSummaryMock = [
  http.get(
    '/api/dashboard/month-summary',
    handleRoute({ query: monthQuerySchema, response: monthSummaryDtoSchema }, ({ query }) => {
      const period = computePeriod(query.month);
      const lines = buildLines(db);
      const isCurrentMonth = query.month === CURRENT_MONTH;

      const received = sumLines(lines, 'income', period.fromOn, period.asOfOn);
      const spent = sumLines(lines, 'expense', period.fromOn, period.asOfOn);
      const previousReceived = sumLines(
        lines,
        'income',
        period.previousFromOn,
        period.previousUntilOn,
      );
      const previousSpent = sumLines(
        lines,
        'expense',
        period.previousFromOn,
        period.previousUntilOn,
      );

      // Expected income (PM rule): the sum of the expected amount of every income occurrence of the
      // month (received, partial and pending); dismissed (skipped) ones stay out.
      const occurrences = listMonthOccurrences(db, query.month).filter(
        (item) => item.kind === 'income' && item.status !== 'skipped' && !item.carriedOver,
      );
      const expected = occurrences.reduce((sum, item) => sum + item.expectedAmountCents, 0);

      const alerts: MonthSummary.Alert[] = [
        ...db.connections
          .filter((connection) => connection.status === 'error')
          .map((connection) => ({
            type: 'connection_error' as const,
            connectionId: connection.id,
            institutionName: connection.institutionName,
            occurrenceId: null,
            recurrenceName: null,
            daysLate: null,
          })),
        ...db.connections
          .filter(
            (connection) =>
              connection.status === 'active' && isConnectionStale(connection.lastBankUpdateAt),
          )
          .map((connection) => ({
            type: 'stale_data' as const,
            connectionId: connection.id,
            institutionName: connection.institutionName,
            occurrenceId: null,
            recurrenceName: null,
            daysLate: null,
          })),
        ...listMonthOccurrences(db, query.month)
          .filter((item) => item.status === 'late')
          .map((item) => ({
            type: 'late_occurrence' as const,
            connectionId: null,
            institutionName: null,
            occurrenceId: item.id,
            recurrenceName: item.recurrenceName,
            daysLate: Math.max(0, daysBetween(item.windowEndOn, TODAY)),
          }))
          .sort((a, b) => b.daysLate - a.daysLate),
      ];
      // Connection alerts are about now, not about a month that passed or has not come.
      const free = isCurrentMonth ? computeFreeBalance(db) : null;

      return {
        month: query.month,
        isCurrentMonth,
        asOfOn: period.asOfOn,
        remaining: free
          ? {
              daysRemaining: free.daysRemaining,
              incomingCents: free.receivable.totalCents,
              outgoingCents: free.payable.totalCents,
            }
          : null,
        income: {
          receivedCents: received,
          expectedCents: expected,
          receivedPct: expected > 0 ? roundOne((received / expected) * 100) : null,
        },
        expenses: {
          spentCents: spent,
          previousSpentCents: previousSpent,
          changeCents: spent - previousSpent,
          changePct:
            previousSpent === 0 ? null : roundOne(((spent - previousSpent) / previousSpent) * 100),
          comparedFromOn: period.fromOn,
          comparedUntilOn: period.asOfOn,
          previousComparedUntilOn: period.previousUntilOn,
        },
        result: { cents: received - spent, previousCents: previousReceived - previousSpent },
        alerts: isCurrentMonth
          ? alerts
          : alerts.filter((alert) => alert.type === 'late_occurrence'),
      };
    }),
  ),
];
