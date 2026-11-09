import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { AgendaEntry } from '#/modules/dashboard/domain/agenda/agenda-entry.type.ts';
import { compareAgendaItems } from '#/modules/dashboard/domain/agenda/compare-agenda-items.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The screen "A pagar e receber" of a month, from the items of the agenda (BR-BIL-001, 002, 005,
// BR-INV-002, BR-DSH-009).
//
// - `payable`: what is left to pay. In the current month it is exactly what the Livre counts as "A
//   pagar" (same items, same total, BR-DSH-003). In another month, what falls due in it.
// - `friendsReceivable`: what friends owe Lucas. It is not income, so it is not in the Livre.
// - `thisMonth`: bills and recurring expenses not settled that fall due in the month (and, in the
//   current month, the late ones), the ones on the card included (they show that they are in the
//   invoice, `countsInFreeBalance` false).
// - `openInvoices`: every invoice not paid, whatever its due date.
// - `receivable`: the bills to receive, friends and general, not settled.
// - `undated`: the bills to pay with no due date, out of the Livre.
// - `settled`: what was settled in the month, the last first.
export function buildAgenda(input: {
  month: Month;
  today: BusinessDate;
  entries: AgendaEntry[];
}): Agenda.Dto {
  const { month, today, entries } = input;
  const isCurrent = Month.containing(today).equals(month);
  const first = month.firstDay().value;
  const last = month.lastDay().value;
  const inMonth = (date: string | null) => date !== null && date >= first && date <= last;
  const isOpen = (entry: AgendaEntry) => entry.item.state !== 'settled';
  const sortedItems = (list: AgendaEntry[]) =>
    list.map((entry) => entry.item).toSorted(compareAgendaItems);
  const sum = (items: Agenda.Item[]) =>
    items.reduce((total, item) => total.add(Money.fromCents(item.remainingCents)), Money.zero())
      .cents;

  const payable = sortedItems(
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
    month: month.value,
    payable: { totalCents: sum(payable), count: payable.length, items: payable },
    friendsReceivable: {
      totalCents: sum(friends.map((entry) => entry.item)),
      peopleCount: new Set(
        friends.map((entry) => normalizeText(entry.item.counterparty ?? entry.item.title)),
      ).size,
    },
    thisMonth: sortedItems(
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
    openInvoices: sortedItems(
      entries.filter((entry) => entry.item.source.type === 'invoice' && isOpen(entry)),
    ),
    receivable: sortedItems(
      entries.filter(
        (entry) => entry.item.flow === 'in' && entry.item.source.type === 'bill' && isOpen(entry),
      ),
    ),
    undated: sortedItems(
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
      .toSorted(
        (a, b) =>
          (b.settledOn ?? '').localeCompare(a.settledOn ?? '') || a.key.localeCompare(b.key),
      ),
  };
}
