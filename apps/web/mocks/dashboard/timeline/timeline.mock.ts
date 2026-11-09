import {
  timelineDtoSchema,
  getTimelineQuerySchema,
} from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';
import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { http } from 'msw';

import { presentAccount } from '#mocks/accounts/account/present-account.util.ts';
import { buildAgendaEntries } from '#mocks/dashboard/agenda/build-agenda-items.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

// An item of the agenda as a chip or a line of the timeline: what is left to pay or receive; of
// what happened, what was paid (the expected amount when it was only marked as done).
function buildTimelineItem(item: Agenda.Item, date: string | null): Timeline.Item {
  const happened = item.state === 'settled';

  return {
    key: item.key,
    source: item.source,
    flow: item.flow,
    title: item.title,
    amountCents: happened
      ? item.paidCents > 0
        ? item.paidCents
        : item.amountCents
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
}

// The day an item that counts in the Livre lands on: its own day; today when it is late; the last
// day of the month when it has no day or falls due after it.
function computeLandingDate(dueOn: string | null, lastDay: string): string {
  if (dueOn === null || dueOn > lastDay) return lastDay;
  if (dueOn < TODAY) return TODAY;

  return dueOn;
}

export const timelineMock = [
  http.get(
    '/api/dashboard/timeline',
    handleRoute({ query: getTimelineQuerySchema, response: timelineDtoSchema }, ({ query }) => {
      const month = query.month;
      const scope = query.scope ?? 'all';
      const isCurrent = month === CURRENT_MONTH;
      const first = dateInMonth(month, 1);
      const lastDay = dateInMonth(month, daysInMonth(month));
      const inMonth = (date: string | null) => date !== null && date >= first && date <= lastDay;
      const days: Timeline.Day[] = Array.from({ length: daysInMonth(month) }, (_, index) => {
        const date = `${month}-${String(index + 1).padStart(2, '0')}`;

        return {
          date,
          isPast: date < TODAY,
          isToday: date === TODAY,
          projectedBalanceCents: null,
          items: [],
        };
      });
      const overdue: Timeline.Item[] = [];
      const undated: Timeline.Item[] = [];
      const place = (date: string, item: Timeline.Item) =>
        days[Number(date.slice(8, 10)) - 1]?.items.push(item);

      const entries = buildAgendaEntries(db, month, { withSettled: true });
      for (const { item, movesCash, carriedOver } of entries) {
        if (scope === 'recurrences' ? item.source.type !== 'occurrence' : !movesCash) continue;

        if (item.state === 'settled') {
          const date = scope === 'recurrences' && inMonth(item.dueOn) ? item.dueOn : item.settledOn;
          if (date !== null && inMonth(date)) place(date, buildTimelineItem(item, date));
          continue;
        }

        if (scope === 'all' && item.remainingCents <= 0) continue;
        if (item.dueOn === null) {
          undated.push(buildTimelineItem(item, null));
          continue;
        }

        if (scope === 'recurrences') {
          // A late one stays on its day (the amber marker); only one that came from an earlier
          // month goes to the chips.
          if (carriedOver) overdue.push(buildTimelineItem(item, item.dueOn));
          else if (inMonth(item.dueOn)) place(item.dueOn, buildTimelineItem(item, item.dueOn));
          continue;
        }

        const isLate = item.state === 'overdue' || (isCurrent && item.dueOn < TODAY);
        if (isLate) {
          if (isCurrent || inMonth(item.dueOn)) overdue.push(buildTimelineItem(item, item.dueOn));
        } else if (inMonth(item.dueOn)) {
          place(item.dueOn, buildTimelineItem(item, item.dueOn));
        } else if (isCurrent && item.countsInFreeBalance) {
          const landsOn = computeLandingDate(item.dueOn, lastDay);
          place(landsOn, buildTimelineItem(item, landsOn));
        }
      }

      const order = (a: Timeline.Item, b: Timeline.Item) =>
        a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }) ||
        a.key.localeCompare(b.key);
      for (const day of days) day.items.sort(order);
      overdue.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || order(a, b));
      undated.sort(order);

      let endBalanceCents: number | null = null;
      if (isCurrent) {
        // What the Livre counts, signed, on the day it lands on.
        const movements = entries
          .map((entry) => entry.item)
          .filter((item) => item.countsInFreeBalance && item.remainingCents > 0)
          .map((item) => ({
            date: computeLandingDate(item.dueOn, lastDay),
            cents: item.flow === 'in' ? item.remainingCents : -item.remainingCents,
          }));
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
