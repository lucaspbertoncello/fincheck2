import {
  agendaDtoSchema,
  getAgendaQuerySchema,
} from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { http } from 'msw';

import { buildAgendaEntries } from '#mocks/dashboard/agenda/build-agenda-items.util.ts';
import { compareAgendaItems } from '#mocks/dashboard/agenda/compare-agenda-items.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

const sumRemaining = (items: { remainingCents: number }[]) =>
  items.reduce((sum, item) => sum + item.remainingCents, 0);

export const agendaMock = [
  http.get(
    '/api/agenda',
    handleRoute({ query: getAgendaQuerySchema, response: agendaDtoSchema }, ({ query }) => {
      const entries = buildAgendaEntries(db, query.month, { withSettled: true });
      const isCurrent = query.month === CURRENT_MONTH;
      const first = dateInMonth(query.month, 1);
      const last = dateInMonth(query.month, 31);
      const inMonth = (date: string | null) => date !== null && date >= first && date <= last;
      const isOpen = (entry: { item: { state: string } }) => entry.item.state !== 'settled';
      const sorted = (list: typeof entries) =>
        list.map((entry) => entry.item).sort(compareAgendaItems);

      // In the month of the Livre, "A pagar" is exactly what the Livre counts; in another one, what
      // falls due in it.
      const payable = sorted(
        entries.filter(({ item, movesCash }) =>
          item.flow !== 'out' || item.remainingCents <= 0 || item.state === 'settled'
            ? false
            : isCurrent
              ? item.countsInFreeBalance
              : movesCash && inMonth(item.dueOn),
        ),
      );
      const friends = entries.filter(
        (entry) => entry.item.badge === 'friend_receivable' && isOpen(entry),
      );

      return {
        month: query.month,
        payable: { totalCents: sumRemaining(payable), count: payable.length, items: payable },
        friendsReceivable: {
          totalCents: sumRemaining(friends.map((entry) => entry.item)),
          peopleCount: new Set(
            friends.map((entry) => normalizeText(entry.item.counterparty ?? entry.item.title)),
          ).size,
        },
        thisMonth: sorted(
          entries.filter(
            ({ item }) =>
              item.flow === 'out' &&
              item.source.type !== 'invoice' &&
              item.state !== 'settled' &&
              (item.dueOn === null
                ? item.source.type === 'occurrence'
                : inMonth(item.dueOn) || (isCurrent && item.dueOn < first)),
          ),
        ),
        openInvoices: sorted(
          entries.filter((entry) => entry.item.source.type === 'invoice' && isOpen(entry)),
        ),
        receivable: sorted(
          entries.filter(
            (entry) =>
              entry.item.flow === 'in' && entry.item.source.type === 'bill' && isOpen(entry),
          ),
        ),
        undated: sorted(
          entries.filter(
            (entry) =>
              entry.item.flow === 'out' &&
              entry.item.source.type === 'bill' &&
              entry.item.dueOn === null &&
              isOpen(entry),
          ),
        ),
        settled: entries
          .map((entry) => entry.item)
          .filter(
            (item) =>
              item.state === 'settled' &&
              inMonth(item.settledOn) &&
              (item.flow === 'out' || item.source.type === 'bill'),
          )
          .sort(
            (a, b) =>
              (b.settledOn ?? '').localeCompare(a.settledOn ?? '') || a.key.localeCompare(b.key),
          ),
      };
    }),
  ),
];
