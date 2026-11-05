import { describe, expect, it } from 'vitest';

import type { TransactionDay } from '#/features/transactions/transaction-list/types/transaction-day.type.ts';
import { groupDaysByMonth } from '#/features/transactions/transaction-list/utils/group-days-by-month.util.ts';

function day(date: string, count = 1): TransactionDay {
  return { date, title: 'Dia', dateLabel: date, totalCents: -100 * count, count, items: [] };
}

describe('groupDaysByMonth', () => {
  it('puts the days under their month, newest first, with the month as the heading', () => {
    const months = groupDaysByMonth([
      day('2026-10-22', 2),
      day('2026-10-02'),
      day('2026-09-30', 3),
      day('2025-12-10'),
    ]);

    expect(months.map((month) => month.key)).toEqual(['2026-10', '2026-09', '2025-12']);
    expect(months.map((month) => month.label)).toEqual([
      'Outubro 2026',
      'Setembro 2026',
      'Dezembro 2025',
    ]);
    expect(months[0]?.days.map((item) => item.date)).toEqual(['2026-10-22', '2026-10-02']);
    expect(months.map((month) => month.count)).toEqual([3, 3, 1]);
  });

  it('keeps the blocks in order when a later page brings an earlier day of a month already shown', () => {
    // An installment keeps its purchase day in the invoice month, so pages are not strictly by competence.
    const months = groupDaysByMonth([day('2026-10-20'), day('2026-09-15'), day('2026-10-25')]);

    expect(months.map((month) => month.key)).toEqual(['2026-10', '2026-09']);
    expect(months[0]?.days.map((item) => item.date)).toEqual(['2026-10-25', '2026-10-20']);
  });

  it('has no month for no day', () => {
    expect(groupDaysByMonth([])).toEqual([]);
  });
});
