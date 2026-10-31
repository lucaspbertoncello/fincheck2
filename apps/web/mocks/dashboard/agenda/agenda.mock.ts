import {
  agendaDtoSchema,
  getAgendaQuerySchema,
} from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { http } from 'msw';

import { buildAgendaItems } from '#mocks/dashboard/agenda/build-agenda-items.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

const byDueOn = (a: { dueOn: string | null }, b: { dueOn: string | null }) =>
  (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999');

export const agendaMock = [
  http.get(
    '/api/agenda',
    handleRoute({ query: getAgendaQuerySchema, response: agendaDtoSchema }, ({ query }) => {
      const items = buildAgendaItems(db, query.month);
      const open = items.filter((item) => item.state !== 'settled');
      const sinceMonthStart = (item: { dueOn: string | null }) =>
        item.dueOn !== null &&
        (item.dueOn.slice(0, 7) === query.month ||
          (query.month === CURRENT_MONTH && item.dueOn.slice(0, 7) < query.month));

      const payable = open.filter(
        (item) => item.flow === 'out' && item.countsInFreeBalance && item.remainingCents > 0,
      );
      const friends = open.filter((item) => item.badge === 'friend_receivable');

      return {
        month: query.month,
        payable: {
          totalCents: payable.reduce((sum, item) => sum + item.remainingCents, 0),
          count: payable.length,
          items: payable,
        },
        friendsReceivable: {
          totalCents: friends.reduce((sum, item) => sum + item.remainingCents, 0),
          peopleCount: new Set(friends.map((item) => item.counterparty)).size,
        },
        thisMonth: open
          .filter(
            (item) =>
              item.flow === 'out' && item.source.type !== 'invoice' && sinceMonthStart(item),
          )
          .sort(byDueOn),
        openInvoices: open.filter((item) => item.source.type === 'invoice').sort(byDueOn),
        receivable: open
          .filter((item) => item.flow === 'in' && item.source.type === 'bill')
          .sort(byDueOn),
        undated: open.filter(
          (item) => item.flow === 'out' && item.source.type === 'bill' && item.dueOn === null,
        ),
        settled: items
          .filter(
            (item) =>
              item.state === 'settled' &&
              item.settledOn?.slice(0, 7) === query.month &&
              (item.flow === 'out' || item.source.type === 'bill'),
          )
          .sort((a, b) => (b.settledOn ?? '').localeCompare(a.settledOn ?? '')),
      };
    }),
  ),
];
