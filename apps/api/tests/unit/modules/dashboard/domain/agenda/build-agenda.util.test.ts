import { describe, expect, it } from 'vitest';

import { buildAgenda } from '#/modules/dashboard/domain/agenda/build-agenda.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { buildTestAgendaEntry } from '#tests/support/dashboard/agenda/build-test-agenda-entry.util.ts';

const today = BusinessDate.of('2026-10-22');
const invoiceSource = {
  type: 'invoice',
  billId: null,
  occurrenceId: null,
  recurrenceId: null,
  accountId: 'card',
  month: '2026-10',
} as const;
const occurrenceSource = {
  ...invoiceSource,
  type: 'occurrence',
  accountId: null,
  month: null,
} as const;

const agenda = (entries: ReturnType<typeof buildTestAgendaEntry>[], month = '2026-10') =>
  buildAgenda({ month: Month.of(month), today, entries });

describe('buildAgenda', () => {
  it('has the "A pagar" of the current month as exactly what the Livre counts, in the order of the due day', () => {
    const dto = agenda([
      buildTestAgendaEntry({ key: 'b', dueOn: '2026-10-28', remainingCents: 3000 }),
      buildTestAgendaEntry({
        key: 'a',
        dueOn: '2026-10-05',
        remainingCents: 1000,
        state: 'overdue',
      }),
      buildTestAgendaEntry({
        key: 'invoice',
        source: invoiceSource,
        dueOn: '2026-11-06',
        remainingCents: 5000,
      }),
      buildTestAgendaEntry({
        key: 'not',
        dueOn: '2026-11-20',
        remainingCents: 9000,
        countsInFreeBalance: false,
      }),
      buildTestAgendaEntry({ key: 'in', flow: 'in', remainingCents: 7000 }),
    ]);

    expect(dto.payable.items.map((item) => item.key)).toEqual(['a', 'b', 'invoice']);
    expect(dto.payable).toMatchObject({ totalCents: 9000, count: 3 });
  });

  it('has, in another month, what falls due in it and moves the account', () => {
    const dto = agenda(
      [
        buildTestAgendaEntry({
          key: 'nov',
          dueOn: '2026-11-10',
          remainingCents: 2000,
          countsInFreeBalance: false,
        }),
        buildTestAgendaEntry({
          key: 'dec',
          dueOn: '2026-12-10',
          remainingCents: 9000,
          countsInFreeBalance: false,
        }),
        buildTestAgendaEntry({
          key: 'card',
          dueOn: '2026-11-12',
          remainingCents: 100,
          movesCash: false,
          source: occurrenceSource,
        }),
      ],
      '2026-11',
    );

    expect(dto.payable.items.map((item) => item.key)).toEqual(['nov']);
    expect(dto.payable.totalCents).toBe(2000);
  });

  it('adds up what friends owe Lucas and counts the people once, whatever the spelling', () => {
    const friend = (key: string, counterparty: string, remainingCents: number) =>
      buildTestAgendaEntry({
        key,
        flow: 'in',
        badge: 'friend_receivable',
        counterparty,
        remainingCents,
        countsInFreeBalance: false,
        movesCash: false,
      });

    const dto = agenda([
      friend('a', 'Júlia', 5800),
      friend('b', 'JULIA', 1000),
      friend('c', 'Rafa', 300),
      buildTestAgendaEntry({
        key: 'settled',
        flow: 'in',
        badge: 'friend_receivable',
        counterparty: 'Beto',
        state: 'settled',
        settledOn: '2026-10-02',
      }),
    ]);

    expect(dto.friendsReceivable).toEqual({ totalCents: 7100, peopleCount: 2 });
  });

  it('sorts "Este mês": bills and recurring expenses not settled that fall due in the month, and the late ones in the current month', () => {
    const dto = agenda([
      buildTestAgendaEntry({ key: 'late', dueOn: '2026-09-10', state: 'overdue' }),
      buildTestAgendaEntry({ key: 'later', dueOn: '2026-10-30' }),
      buildTestAgendaEntry({ key: 'next-month', dueOn: '2026-11-02' }),
      buildTestAgendaEntry({
        key: 'settled',
        dueOn: '2026-10-03',
        state: 'settled',
        settledOn: '2026-10-03',
      }),
      buildTestAgendaEntry({ key: 'invoice', source: invoiceSource, dueOn: '2026-10-28' }),
      buildTestAgendaEntry({ key: 'income', flow: 'in', dueOn: '2026-10-28' }),
      buildTestAgendaEntry({
        key: 'card',
        source: occurrenceSource,
        dueOn: '2026-10-12',
        countsInFreeBalance: false,
        movesCash: false,
      }),
      buildTestAgendaEntry({ key: 'undated-bill', dueOn: null }),
      buildTestAgendaEntry({ key: 'undated-occurrence', source: occurrenceSource, dueOn: null }),
    ]);

    expect(dto.thisMonth.map((item) => item.key)).toEqual([
      'late',
      'card',
      'later',
      'undated-occurrence',
    ]);
    // A past month does not take the late ones along.
    expect(
      agenda(
        [buildTestAgendaEntry({ key: 'late', dueOn: '2026-08-10', state: 'overdue' })],
        '2026-09',
      ).thisMonth,
    ).toEqual([]);
  });

  it('lists the open invoices, the bills to receive, the ones with no date and the ones settled in the month', () => {
    const dto = agenda([
      buildTestAgendaEntry({ key: 'inv-b', source: invoiceSource, dueOn: '2026-11-06' }),
      buildTestAgendaEntry({ key: 'inv-a', source: invoiceSource, dueOn: '2026-10-28' }),
      buildTestAgendaEntry({
        key: 'inv-paid',
        source: invoiceSource,
        state: 'settled',
        settledOn: '2026-10-20',
      }),
      buildTestAgendaEntry({ key: 'recv', flow: 'in', dueOn: '2026-10-30' }),
      buildTestAgendaEntry({ key: 'recv-occ', flow: 'in', source: occurrenceSource }),
      buildTestAgendaEntry({ key: 'undated', dueOn: null }),
      buildTestAgendaEntry({ key: 'bill-paid', state: 'settled', settledOn: '2026-10-21' }),
      buildTestAgendaEntry({ key: 'old', state: 'settled', settledOn: '2026-09-21' }),
      buildTestAgendaEntry({
        key: 'income-paid',
        flow: 'in',
        source: occurrenceSource,
        state: 'settled',
        settledOn: '2026-10-22',
      }),
    ]);

    expect(dto.openInvoices.map((item) => item.key)).toEqual(['inv-a', 'inv-b']);
    expect(dto.receivable.map((item) => item.key)).toEqual(['recv']);
    expect(dto.undated.map((item) => item.key)).toEqual(['undated']);
    expect(dto.settled.map((item) => item.key)).toEqual(['bill-paid', 'inv-paid']);
  });
});
