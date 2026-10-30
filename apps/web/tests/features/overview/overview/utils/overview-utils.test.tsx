import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import type { MonthSummary } from '@fincheck/shared/dashboard/month-summary/month-summary.type.ts';
import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';
import { describe, expect, it } from 'vitest';

import { buildAlerts } from '#/features/overview/overview/utils/build-alerts.util.ts';
import { buildCategories } from '#/features/overview/overview/utils/build-categories.util.tsx';
import { buildSpend } from '#/features/overview/overview/utils/build-spend.util.ts';
import {
  buildStrip,
  pickDefaultDate,
} from '#/features/overview/overview/utils/build-strip.util.ts';

function expense(
  id: string | null,
  spent: number,
  previous: number,
): CategoryBreakdown.ExpenseItem {
  return {
    categoryId: id,
    spentCents: spent,
    previousSpentCents: previous,
    changeCents: spent - previous,
    changePct: previous > 0 ? ((spent - previous) / previous) * 100 : null,
    sharePct: 10,
    transactionCount: 3,
    latest: [],
  };
}

function breakdown(
  items: CategoryBreakdown.ExpenseItem[],
  topGrowth: CategoryBreakdown.Dto['expenses']['topGrowth'],
): CategoryBreakdown.Dto {
  return {
    month: '2026-10',
    comparedUntilOn: '2026-10-30',
    expenses: { totalCents: 0, previousTotalCents: 0, items, topGrowth },
    review: { count: 0, totalCents: 0 },
    incomes: { receivedCents: 0, expectedCents: 0, items: [] },
  };
}

const CATEGORIES = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
  id,
  name: `Cat ${id}`,
})) as unknown as Category.Dto[];

describe('buildCategories', () => {
  it('keeps four categories and folds the rest into "Outros"', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) =>
      expense(id, 600 - index * 100, 100),
    );
    const data = buildCategories('2026-10', breakdown(items, null), CATEGORIES);

    expect(data.slices.map((slice) => slice.name)).toEqual([
      'Cat a',
      'Cat b',
      'Cat c',
      'Cat d',
      'Outros',
    ]);
    expect(data.slices.at(-1)).toMatchObject({ isOther: true, cents: 300 });
  });

  it('puts the "onde mais cresceu" category in the center and in the insight', () => {
    const items = [expense('a', 500, 100), expense('b', 200, 200)];
    const data = buildCategories(
      '2026-10',
      breakdown(items, { categoryId: 'a', changePct: 400, changeCents: 400 }),
      CATEGORIES,
    );

    expect(data.centerTitle).toBe('Cat a');
    expect(data.centerDetail).toBe('+400% que set.');
    expect(data.insight).toMatchObject({
      categoryName: 'Cat a',
      changeCents: 400,
      transactionCount: 3,
    });
    expect(data.collapsedSummary).toBe('Cat a cresceu 400%');
  });

  it('names the uncategorized spending and has no insight without growth', () => {
    const data = buildCategories('2026-10', breakdown([expense(null, 100, 0)], null), CATEGORIES);

    expect(data.slices[0]?.name).toBe('Sem categoria');
    expect(data.insight).toBeUndefined();
    expect(data.hasSpending).toBe(true);
  });
});

function day(date: string, overrides: Partial<Timeline.Day> = {}): Timeline.Day {
  return {
    date,
    isPast: false,
    isToday: false,
    projectedBalanceCents: 100,
    items: [],
    ...overrides,
  };
}

describe('buildStrip', () => {
  it('starts today and drops the past days', () => {
    const strip = buildStrip({
      month: '2026-10',
      today: '2026-10-22',
      days: [
        day('2026-10-21', { isPast: true, projectedBalanceCents: null }),
        day('2026-10-22', { isToday: true }),
      ],
      overdue: [],
      undated: [],
      endBalanceCents: 0,
    });

    expect(strip.days.map((entry) => entry.date)).toEqual(['2026-10-22']);
    expect(strip.days[0]?.totalCents).toBe(100);
  });

  it('shows the whole month when it already ended', () => {
    const strip = buildStrip({
      month: '2026-09',
      today: '2026-10-22',
      days: [day('2026-09-01', { isPast: true, projectedBalanceCents: null })],
      overdue: [],
      undated: [],
      endBalanceCents: null,
    });

    expect(strip.days).toHaveLength(1);
    expect(strip.days[0]?.totalCents).toBeUndefined();
  });

  it('opens on the first day that has something', () => {
    const item = { key: 'k' } as Timeline.Item;
    expect(
      pickDefaultDate([
        { date: '2026-10-22', items: [] },
        { date: '2026-10-25', items: [item] },
      ]),
    ).toBe('2026-10-25');
    expect(pickDefaultDate([{ date: '2026-10-22', items: [] }])).toBe('2026-10-22');
  });
});

describe('buildSpend', () => {
  it('stops the current line at the last day with a value', () => {
    const spend = buildSpend({
      month: '2026-10',
      previousMonth: '2026-09',
      days: [
        { day: 1, currentCents: 10, previousCents: 5 },
        { day: 2, currentCents: 30, previousCents: 8 },
        { day: 3, currentCents: null, previousCents: null },
      ],
    });

    expect(spend.today).toBe(2);
    expect(spend.current).toEqual([
      { day: 1, cents: 10 },
      { day: 2, cents: 30 },
    ]);
    expect(spend.previous).toHaveLength(2);
    expect(spend.daysInMonth).toBe(3);
    expect(spend.currentLabel).toBe('Outubro');
  });
});

function alert(overrides: Partial<MonthSummary.Alert>): MonthSummary.Alert {
  return {
    type: 'stale_data',
    connectionId: 'c',
    institutionName: 'Nubank',
    occurrenceId: null,
    recurrenceName: null,
    daysLate: null,
    ...overrides,
  };
}

describe('buildAlerts', () => {
  const hrefs = { settings: '/settings', recurrences: '/recurrences' };

  it('writes each alert and sends it to the right screen', () => {
    const alerts = buildAlerts(
      [
        alert({ type: 'connection_error' }),
        alert({
          type: 'late_occurrence',
          connectionId: null,
          institutionName: null,
          occurrenceId: 'o',
          recurrenceName: 'Maxxy',
          daysLate: 2,
        }),
      ],
      hrefs,
    );

    expect(alerts.map((entry) => entry.message)).toEqual([
      'Conexão com erro no Nubank',
      'Maxxy atrasado 2 dias',
    ]);
    expect(alerts.map((entry) => entry.href)).toEqual(['/settings', '/recurrences']);
  });

  it('shows at most two', () => {
    expect(buildAlerts([alert({}), alert({}), alert({})], hrefs)).toHaveLength(2);
  });
});
