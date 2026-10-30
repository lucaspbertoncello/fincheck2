import { describe, expect, it } from 'vitest';

import { formatDayHeading } from '#/features/transactions/transaction-list/utils/format-day-heading.util.ts';
import { groupTransactionsByDay } from '#/features/transactions/transaction-list/utils/group-transactions-by-day.util.ts';
import { takeRows } from '#/features/transactions/transaction-list/utils/take-rows.util.ts';
import { makeTransaction } from '#tests/support/transactions/make-transaction.util.ts';

const TODAY = '2026-10-30';

describe('formatDayHeading', () => {
  it('says Hoje, Ontem and the weekday', () => {
    expect(formatDayHeading('2026-10-30', TODAY)).toEqual({
      title: 'Hoje',
      dateLabel: '30 de outubro',
    });
    expect(formatDayHeading('2026-10-29', TODAY).title).toBe('Ontem');
    expect(formatDayHeading('2026-10-27', TODAY)).toEqual({
      title: 'Terça',
      dateLabel: '27 de outubro',
    });
  });
});

describe('groupTransactionsByDay', () => {
  const items = [
    makeTransaction({ id: 'a', competenceOn: '2026-10-30', amountCents: -1000 }),
    makeTransaction({ id: 'b', competenceOn: '2026-10-30', amountCents: 400, nature: 'income' }),
    makeTransaction({
      id: 'c',
      competenceOn: '2026-10-30',
      amountCents: -9999,
      nature: 'transfer',
    }),
    makeTransaction({
      id: 'd',
      competenceOn: '2026-10-30',
      amountCents: -500,
      ignoredAt: '2026-10-30T10:00:00.000Z',
    }),
    makeTransaction({ id: 'e', competenceOn: '2026-10-29', amountCents: -300 }),
  ];

  it('groups by competence day and totals only what counts in the month', () => {
    const days = groupTransactionsByDay(items, TODAY);

    expect(days.map((day) => [day.title, day.count, day.totalCents])).toEqual([
      ['Hoje', 4, -600],
      ['Ontem', 1, -300],
    ]);
  });

  it('takeRows cuts after N transactions and keeps the real count of the day', () => {
    const cut = takeRows(groupTransactionsByDay(items, TODAY), 2);

    expect(cut).toHaveLength(1);
    expect(cut[0]?.items).toHaveLength(2);
    expect(cut[0]?.count).toBe(4);
  });
});
