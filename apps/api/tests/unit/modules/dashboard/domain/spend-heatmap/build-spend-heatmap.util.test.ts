import { describe, expect, it } from 'vitest';

import { computeCategoryTrend } from '#/modules/dashboard/domain/category-trend/compute-category-trend.util.ts';
import { buildSpendHeatmap } from '#/modules/dashboard/domain/spend-heatmap/build-spend-heatmap.util.ts';
import { resolveHeatmapWindow } from '#/modules/dashboard/domain/spend-heatmap/resolve-heatmap-window.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const day = (value: string) => BusinessDate.of(value);

describe('resolveHeatmapWindow', () => {
  const today = day('2026-10-22');

  it('is 12 whole calendar months up to today by default: from the 1st of November of the year before', () => {
    const window = resolveHeatmapWindow({
      until: undefined,
      from: undefined,
      to: undefined,
      today,
    });

    expect([window.fromOn.value, window.untilOn.value]).toEqual(['2025-11-01', '2026-10-22']);
  });

  it('follows `until`, and a leap day is in the window', () => {
    const window = resolveHeatmapWindow({
      until: day('2028-02-29'),
      from: undefined,
      to: undefined,
      today,
    });

    expect([window.fromOn.value, window.untilOn.value]).toEqual(['2027-03-01', '2028-02-29']);
  });

  it('is exactly `from` to `to` when they come', () => {
    const window = resolveHeatmapWindow({
      until: undefined,
      from: day('2026-02-01'),
      to: day('2026-02-28'),
      today,
    });

    expect([window.fromOn.value, window.untilOn.value]).toEqual(['2026-02-01', '2026-02-28']);
  });
});

describe('buildSpendHeatmap', () => {
  it('has one item per day with no gaps, the days with no spending at level 0, and the totals of the summary', () => {
    const dto = buildSpendHeatmap({
      fromOn: day('2026-10-01'),
      untilOn: day('2026-10-10'),
      lines: [
        { on: '2026-10-02', cents: 1000 },
        { on: '2026-10-02', cents: 500 },
        { on: '2026-10-04', cents: 8000 },
        { on: '2026-10-09', cents: 100 },
      ],
    });

    expect(dto.days).toHaveLength(10);
    expect(dto.days.map((entry) => entry.date)).toEqual(
      Array.from({ length: 10 }, (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`),
    );
    expect(dto.days[0]).toEqual({ date: '2026-10-01', totalCents: 0, level: 0 });
    expect(dto.days[1]).toMatchObject({ date: '2026-10-02', totalCents: 1500 });
    expect(dto.totalCents).toBe(9600);
    expect(dto.spendingDays).toBe(3);
    expect(dto.peak).toEqual({ date: '2026-10-04', totalCents: 8000 });
    expect(dto.levels).toHaveLength(4);
  });

  it('puts the day off the curve at level 4 without wiping out the others (quantiles)', () => {
    const lines = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((cents, index) => ({
      on: `2026-10-${String(index + 1).padStart(2, '0')}`,
      cents,
    }));
    lines.push({ on: '2026-10-10', cents: 500000 });

    const dto = buildSpendHeatmap({ fromOn: day('2026-10-01'), untilOn: day('2026-10-10'), lines });

    expect(dto.days.at(-1)?.level).toBe(4);
    expect(new Set(dto.days.map((entry) => entry.level)).size).toBe(4);
  });

  it('never lets a day go below zero: a refund bigger than the spending of its day does not paint it', () => {
    const dto = buildSpendHeatmap({
      fromOn: day('2026-10-01'),
      untilOn: day('2026-10-02'),
      lines: [
        { on: '2026-10-01', cents: -5000 },
        { on: '2026-10-02', cents: 1000 },
        { on: '2026-10-02', cents: -400 },
      ],
    });

    expect(dto.days[0]).toEqual({ date: '2026-10-01', totalCents: 0, level: 0 });
    expect(dto.days[1]).toMatchObject({ date: '2026-10-02', totalCents: 600 });
    expect(dto.totalCents).toBe(600);
  });

  it('has an empty legend, no peak and everything at level 0 when nothing was spent', () => {
    const dto = buildSpendHeatmap({
      fromOn: day('2026-02-01'),
      untilOn: day('2026-02-28'),
      lines: [],
    });

    expect(dto).toMatchObject({ totalCents: 0, spendingDays: 0, peak: null, levels: [] });
    expect(dto.days).toHaveLength(28);
    expect(dto.days.every((entry) => entry.level === 0 && entry.totalCents === 0)).toBe(true);
  });

  it('keeps the first day of a tie as the peak, and counts the days of a leap year', () => {
    const dto = buildSpendHeatmap({
      fromOn: day('2027-03-01'),
      untilOn: day('2028-02-29'),
      lines: [
        { on: '2027-04-10', cents: 700 },
        { on: '2027-04-02', cents: 700 },
      ],
    });

    expect(dto.peak?.date).toBe('2027-04-02');
    expect(dto.days).toHaveLength(366);
  });
});

describe('computeCategoryTrend', () => {
  const line = (transactionId: string, on: string, amountCents: number) => ({
    transactionId,
    on,
    amountCents,
  });

  it('has the 12 months up to `until`, oldest first, the ones with no movement with 0', () => {
    const months = computeCategoryTrend({
      until: Month.of('2026-10'),
      kind: 'expense',
      lines: [line('1', '2026-10-05', -5000), line('2', '2025-11-30', -700)],
    });

    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: '2025-11', totalCents: 700, transactionCount: 1 });
    expect(months[11]).toEqual({ month: '2026-10', totalCents: 5000, transactionCount: 1 });
    expect(months[5]).toEqual({ month: '2026-04', totalCents: 0, transactionCount: 0 });
  });

  it('adds what was spent for an expense category (a refund lowers it) and what was received for an income one', () => {
    const lines = [line('1', '2026-10-05', -5000), line('2', '2026-10-06', 1200)];

    expect(
      computeCategoryTrend({ until: Month.of('2026-10'), kind: 'expense', lines })[11]?.totalCents,
    ).toBe(3800);
    expect(
      computeCategoryTrend({
        until: Month.of('2026-10'),
        kind: 'income',
        lines: [line('3', '2026-10-01', 420000)],
      })[11]?.totalCents,
    ).toBe(420000);
  });

  it('counts a split transaction once in the month, and has no -0', () => {
    const months = computeCategoryTrend({
      until: Month.of('2026-02'),
      kind: 'expense',
      lines: [line('1', '2026-02-28', -100), line('1', '2026-02-28', -200)],
    });

    expect(months[11]).toEqual({ month: '2026-02', totalCents: 300, transactionCount: 1 });
    expect(Object.is(months[0]?.totalCents, 0)).toBe(true);
  });

  it('is 0, never negative, in a month where a refund was bigger than the spending (and keeps the count)', () => {
    const months = computeCategoryTrend({
      until: Month.of('2026-10'),
      kind: 'expense',
      lines: [line('1', '2026-10-05', -1000), line('2', '2026-10-06', 4000)],
    });

    expect(months[11]).toEqual({ month: '2026-10', totalCents: 0, transactionCount: 2 });
    expect(Object.is(months[11]?.totalCents, 0)).toBe(true);
  });

  it('crosses the year', () => {
    const months = computeCategoryTrend({ until: Month.of('2026-03'), kind: 'expense', lines: [] });

    expect(months.map((item) => item.month).slice(0, 3)).toEqual(['2025-04', '2025-05', '2025-06']);
    expect(months.at(-1)?.month).toBe('2026-03');
  });
});
