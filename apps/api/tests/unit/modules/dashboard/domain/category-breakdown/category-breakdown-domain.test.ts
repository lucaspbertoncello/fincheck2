import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import { describe, expect, it } from 'vitest';

import type { AgendaOccurrence } from '#/modules/dashboard/domain/agenda/agenda-occurrence.type.ts';
import { buildExpenseItems } from '#/modules/dashboard/domain/category-breakdown/build-expense-items.util.ts';
import { buildIncomeItems } from '#/modules/dashboard/domain/category-breakdown/build-income-items.util.ts';
import { computeBreakdownWindow } from '#/modules/dashboard/domain/category-breakdown/compute-breakdown-window.util.ts';
import { pickTopGrowth } from '#/modules/dashboard/domain/category-breakdown/pick-top-growth.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const line = (
  transactionId: string,
  categoryId: string | null,
  cents: number,
  occurredOn = '2026-10-10',
) => ({
  transactionId,
  description: `desc ${transactionId}`,
  occurredOn,
  amountCents: -cents,
  categoryId,
});

describe('buildExpenseItems', () => {
  it('groups by category, biggest first, "Sem categoria" last, and the sum of the items is the total', () => {
    const result = buildExpenseItems({
      current: [
        line('1', null, 90000),
        line('2', 'food', 3000),
        line('3', 'food', 2000),
        line('4', 'car', 8000),
      ],
      previous: [line('5', 'food', 4000)],
    });

    expect(result.items.map((item) => [item.categoryId, item.spentCents])).toEqual([
      ['car', 8000],
      ['food', 5000],
      [null, 90000],
    ]);
    expect(result.totalCents).toBe(103000);
    expect(result.items.reduce((total, item) => total + item.spentCents, 0)).toBe(
      result.totalCents,
    );
    expect(result.previousTotalCents).toBe(4000);
  });

  it('compares with the period before: change in cents, percentage with one decimal, and the share of the total', () => {
    const { items } = buildExpenseItems({
      current: [line('1', 'food', 5000), line('2', 'car', 15000)],
      previous: [line('3', 'food', 4000)],
    });

    const food = items.find((item) => item.categoryId === 'food');
    const car = items.find((item) => item.categoryId === 'car');
    expect(food).toMatchObject({
      previousSpentCents: 4000,
      changeCents: 1000,
      changePct: 25,
      sharePct: 25,
    });
    // A category with nothing before: the change is the whole spending, the percentage has no base.
    expect(car).toMatchObject({
      previousSpentCents: 0,
      changeCents: 15000,
      changePct: null,
      sharePct: 75,
    });
  });

  it('lowers the spending with a refund and counts a split transaction once per category', () => {
    const { items } = buildExpenseItems({
      current: [
        line('1', 'food', 5000),
        { ...line('2', 'food', 1000), amountCents: 1000 },
        line('3', 'food', 700),
      ],
      previous: null,
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ spentCents: 4700, transactionCount: 3 });
    const split = buildExpenseItems({
      current: [line('1', 'food', 100), line('1', 'food', 200)],
      previous: null,
    });
    expect(split.items[0]).toMatchObject({ spentCents: 300, transactionCount: 1 });
  });

  it('has no comparison over all the history (null fields) and no share when the total is not positive', () => {
    const { items, previousTotalCents } = buildExpenseItems({
      current: [line('1', 'food', 100)],
      previous: null,
    });

    expect(previousTotalCents).toBeNull();
    expect(items[0]).toMatchObject({
      previousSpentCents: null,
      changeCents: null,
      changePct: null,
      sharePct: 100,
    });
    expect(buildExpenseItems({ current: [], previous: null })).toEqual({
      totalCents: 0,
      previousTotalCents: null,
      items: [],
    });
    expect(
      buildExpenseItems({
        current: [{ ...line('1', 'food', 500), amountCents: 500 }],
        previous: null,
      }).items[0]?.sharePct,
    ).toBeNull();
  });

  it('has a share of 0, never negative, for a category whose refund was bigger than its spending (the total stays the sum)', () => {
    const result = buildExpenseItems({
      current: [
        line('1', 'food', 10000),
        line('2', 'toys', 1000),
        { ...line('3', 'toys', 3000), amountCents: 3000 },
      ],
      previous: null,
    });

    expect(result.totalCents).toBe(8000);
    expect(result.items.map((item) => [item.categoryId, item.spentCents, item.sharePct])).toEqual([
      ['food', 10000, 125],
      ['toys', -2000, 0],
    ]);
    expect(Object.is(result.items[1]?.sharePct, 0)).toBe(true);
  });

  it('keeps the last three of a category, the most recent day first', () => {
    const { items } = buildExpenseItems({
      current: [
        line('a', 'food', 1, '2026-10-01'),
        line('b', 'food', 1, '2026-10-09'),
        line('c', 'food', 1, '2026-10-05'),
        line('d', 'food', 1, '2026-10-07'),
      ],
      previous: null,
    });

    expect(items[0]?.latest.map((entry) => entry.transactionId)).toEqual(['b', 'd', 'c']);
    expect(items[0]?.latest[0]).toEqual({
      transactionId: 'b',
      description: 'desc b',
      occurredOn: '2026-10-09',
      amountCents: -1,
    });
  });
});

describe('pickTopGrowth', () => {
  const item = (
    categoryId: string | null,
    previous: number | null,
    change: number | null,
  ): CategoryBreakdown.ExpenseItem => ({
    categoryId,
    spentCents: (previous ?? 0) + (change ?? 0),
    previousSpentCents: previous,
    changeCents: change,
    changePct: null,
    sharePct: null,
    transactionCount: 1,
    latest: [],
  });

  it('is the biggest rise in reais among the ones with at least R$ 20,00 before and a rise of at least 10%', () => {
    const top = pickTopGrowth([
      item('a', 10000, 5000),
      item('b', 100000, 20000),
      item('c', 50000, 2000),
    ]);

    expect(top).toEqual({ categoryId: 'b', changePct: null, changeCents: 20000 });
  });

  it('leaves out a category that was almost empty before (R$ 19,99), one that rose less than 10% and "Sem categoria"', () => {
    expect(pickTopGrowth([item('tiny', 1999, 50000)])).toBeNull();
    expect(pickTopGrowth([item('flat', 100000, 9999)])).toBeNull();
    expect(pickTopGrowth([item(null, 100000, 90000)])).toBeNull();
  });

  it('takes exactly R$ 20,00 before and exactly 10%', () => {
    expect(pickTopGrowth([item('edge', 2000, 200)])).toMatchObject({ categoryId: 'edge' });
  });

  it('is null when nothing rose or there is no period before', () => {
    expect(pickTopGrowth([item('a', 10000, -500), item('b', 10000, 0)])).toBeNull();
    expect(pickTopGrowth([item('a', null, null)])).toBeNull();
    expect(pickTopGrowth([])).toBeNull();
  });
});

describe('buildIncomeItems', () => {
  const occurrence = (overrides: Partial<AgendaOccurrence>): AgendaOccurrence =>
    ({
      id: 'o',
      recurrenceName: 'Mesada',
      categoryId: 'mesada',
      remainingCents: 42500,
      expectedOn: '2026-10-25',
      status: 'partial',
      ...overrides,
    }) as AgendaOccurrence;

  it('has the received and the expected by category, the pending ones and the biggest expectation first', () => {
    const items = buildIncomeItems({
      received: [{ transactionId: 't1', cents: 42500, categoryId: 'mesada' }],
      expectation: {
        totalCents: 505000,
        byCategory: new Map([
          ['mesada', 85000],
          ['maxxy', 420000],
        ]),
      },
      occurrences: [
        occurrence({}),
        occurrence({
          id: 'm',
          recurrenceName: 'Maxxy',
          categoryId: 'maxxy',
          remainingCents: 420000,
          status: 'expected',
          expectedOn: '2026-10-25',
        }),
      ],
    });

    expect(
      items.map((item) => [
        item.categoryId,
        item.receivedCents,
        item.expectedCents,
        item.transactionCount,
      ]),
    ).toEqual([
      ['maxxy', 0, 420000, 0],
      ['mesada', 42500, 85000, 1],
    ]);
    expect(items[1]?.pending).toEqual([
      {
        occurrenceId: 'o',
        recurrenceName: 'Mesada',
        remainingCents: 42500,
        expectedOn: '2026-10-25',
        status: 'partial',
      },
    ]);
  });

  it('has only what came in without a month (no expectation), and no pending one that is confirmed or skipped', () => {
    const items = buildIncomeItems({
      received: [{ transactionId: 't1', cents: 100, categoryId: null }],
      expectation: null,
      occurrences: [],
    });
    expect(items).toEqual([
      { categoryId: null, receivedCents: 100, expectedCents: 0, transactionCount: 1, pending: [] },
    ]);

    const done = buildIncomeItems({
      received: [],
      expectation: { totalCents: 1, byCategory: new Map([['mesada', 1]]) },
      occurrences: [occurrence({ status: 'confirmed', remainingCents: 0 })],
    });
    expect(done[0]?.pending).toEqual([]);
  });
});

describe('computeBreakdownWindow', () => {
  const today = BusinessDate.of('2026-10-22');

  it('is the same window as the overview for a month, and the whole month for what is expected of it', () => {
    expect(
      computeBreakdownWindow({ month: Month.of('2026-10'), from: undefined, to: undefined, today }),
    ).toEqual({
      month: '2026-10',
      fromOn: '2026-10-01',
      untilOn: '2026-10-22',
      previous: { fromOn: '2026-09-01', untilOn: '2026-09-22' },
      comparedUntilOn: '2026-10-22',
      wholeMonth: { fromOn: '2026-10-01', untilOn: '2026-10-31' },
    });
  });

  it('compares a free period with the period of the same size right before (both ends included)', () => {
    const window = computeBreakdownWindow({
      month: undefined,
      from: BusinessDate.of('2026-10-10'),
      to: BusinessDate.of('2026-10-19'),
      today,
    });

    expect(window).toMatchObject({
      month: null,
      fromOn: '2026-10-10',
      untilOn: '2026-10-19',
      previous: { fromOn: '2026-09-30', untilOn: '2026-10-09' },
      comparedUntilOn: '2026-10-19',
      wholeMonth: null,
    });
  });

  it('has no limits and no comparison over all the history', () => {
    expect(
      computeBreakdownWindow({ month: undefined, from: undefined, to: undefined, today }),
    ).toEqual({
      month: null,
      fromOn: null,
      untilOn: null,
      previous: null,
      comparedUntilOn: null,
      wholeMonth: null,
    });
  });
});
