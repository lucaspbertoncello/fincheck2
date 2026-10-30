import {
  timelineDtoSchema,
  getTimelineQuerySchema,
} from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';
import { http } from 'msw';

import { presentAccount } from '#mocks/accounts/account/present-account.util.ts';
import { buildAgendaItems } from '#mocks/dashboard/agenda/build-agenda-items.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/clock.constant.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

export const timelineMock = [
  http.get(
    '/api/dashboard/timeline',
    handleRoute({ query: getTimelineQuerySchema, response: timelineDtoSchema }, ({ query }) => {
      const month = query.month;
      const isCurrent = month === CURRENT_MONTH;
      const lastDay = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
      const days: Timeline.Day[] = Array.from({ length: daysInMonth(month) }, (_, index) => {
        const date = `${month}-${String(index + 1).padStart(2, '0')}`;

        return {
          date,
          isPast: isCurrent ? date < TODAY : month < CURRENT_MONTH,
          isToday: date === TODAY,
          projectedBalanceCents: null,
          items: [],
        };
      });
      const overdue: Timeline.Item[] = [];
      const undated: Timeline.Item[] = [];
      // What counts in the Livre, with the day it lands on (late ones today, far ones at month's end).
      const movements: { date: string; cents: number }[] = [];

      for (const item of buildAgendaItems(db, month)) {
        if (query.scope === 'recurrences' && item.source.type !== 'occurrence') continue;
        const happened = item.state === 'settled';
        if (happened && item.settledOn?.slice(0, 7) !== month) continue;
        if (!happened && item.remainingCents === 0 && item.source.type !== 'occurrence') continue;

        const date = happened ? item.settledOn : item.dueOn;
        const entry: Timeline.Item = {
          key: item.key,
          source: item.source,
          flow: item.flow,
          title: item.title,
          amountCents: happened
            ? Math.max(item.paidCents, 0) || item.amountCents
            : item.remainingCents,
          state: happened
            ? 'happened'
            : item.state === 'overdue'
              ? 'late'
              : item.state === 'partial'
                ? 'partial'
                : 'expected',
          date,
        };

        if (!happened && date === null) undated.push(entry);
        else if (
          !happened &&
          (entry.state === 'late' || (isCurrent && date !== null && date < TODAY))
        )
          overdue.push(entry);
        else if (date !== null && date.slice(0, 7) === month)
          days[Number(date.slice(8, 10)) - 1]?.items.push(entry);

        if (isCurrent && !happened && item.countsInFreeBalance && item.remainingCents > 0) {
          let landsOn = date ?? lastDay;
          if (landsOn < TODAY) landsOn = TODAY;
          if (landsOn > lastDay) landsOn = lastDay;
          movements.push({
            date: landsOn,
            cents: item.flow === 'in' ? item.remainingCents : -item.remainingCents,
          });
        }
      }

      let endBalanceCents: number | null = null;
      if (isCurrent) {
        let balance = db.accounts
          .filter((account) => !account.archivedAt && account.type !== 'credit_card')
          .reduce((sum, account) => sum + (presentAccount(db, account).balanceCents ?? 0), 0);
        for (const day of days) {
          if (day.date < TODAY) continue;
          balance += movements
            .filter((movement) => movement.date === day.date)
            .reduce((sum, movement) => sum + movement.cents, 0);
          day.projectedBalanceCents = balance;
        }
        endBalanceCents = balance;
      }

      return { month, today: TODAY, days, overdue, undated, endBalanceCents };
    }),
  ),
];
