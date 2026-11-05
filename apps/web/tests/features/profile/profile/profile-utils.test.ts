import { describe, expect, it } from 'vitest';

import { buildHeatmapDayHref } from '#/features/profile/profile/utils/build-heatmap-day-href.util.ts';
import { buildRecurrenceHref } from '#/features/profile/profile/utils/build-recurrence-href.util.ts';
import { formatPeakDay } from '#/features/profile/profile/utils/format-peak-day.util.ts';
import { formatShortDay } from '#/features/profile/profile/utils/format-short-day.util.ts';
import { summarizeHeatmap } from '#/features/profile/profile/utils/summarize-heatmap.util.ts';

describe('summarizeHeatmap', () => {
  const days = [
    { date: '2026-10-01', totalCents: 10000, level: 4 },
    { date: '2026-10-02', totalCents: 0, level: 0 },
    { date: '2026-10-03', totalCents: 5000, level: 2 },
    { date: '2026-10-04', totalCents: 0, level: 0 },
  ];

  it('gives the average over every day, the empty days and the biggest one', () => {
    const summary = summarizeHeatmap({
      fromOn: '2026-10-01',
      untilOn: '2026-10-04',
      totalCents: 15000,
      spendingDays: 2,
      peak: { date: '2026-10-01', totalCents: 10000 },
      levels: [],
      days,
    });

    expect(summary).toEqual({
      peak: { date: '2026-10-01', totalCents: 10000 },
      averageCents: 3750,
      daysWithoutSpending: 2,
      spendingDays: 2,
      dayCount: 4,
    });
  });

  it('counts only the days up to today, so a year that has not ended does not pull the average down', () => {
    const summary = summarizeHeatmap(
      {
        fromOn: '2026-10-01',
        untilOn: '2026-10-04',
        totalCents: 15000,
        spendingDays: 2,
        peak: { date: '2026-10-01', totalCents: 10000 },
        levels: [],
        days,
      },
      '2026-10-03',
    );

    expect(summary.dayCount).toBe(3);
    expect(summary.averageCents).toBe(5000);
    expect(summary.daysWithoutSpending).toBe(1);
  });

  it('leaves out of the figures what a day after today holds (the total, the biggest day)', () => {
    const summary = summarizeHeatmap(
      {
        fromOn: '2026-10-01',
        untilOn: '2026-10-04',
        totalCents: 90000,
        spendingDays: 3,
        peak: { date: '2026-10-04', totalCents: 75000 },
        levels: [],
        days: [...days.slice(0, 3), { date: '2026-10-04', totalCents: 75000, level: 4 }],
      },
      '2026-10-03',
    );

    expect(summary.peak).toEqual({ date: '2026-10-01', totalCents: 10000 });
    expect(summary.averageCents).toBe(5000);
    expect(summary.spendingDays).toBe(2);
  });

  it('does not divide by zero when there are no days', () => {
    expect(
      summarizeHeatmap({
        fromOn: '2026-10-01',
        untilOn: '2026-10-01',
        totalCents: 0,
        spendingDays: 0,
        peak: null,
        levels: [],
        days: [],
      }).averageCents,
    ).toBe(0);
  });
});

describe('profile links and dates', () => {
  it('opens the transactions of a day in its month', () => {
    expect(buildHeatmapDayHref('2026-03-12')).toBe('/transactions?month=2026-03&day=2026-03-12');
  });

  it('creates or edits an income source through the recurrence modal', () => {
    expect(buildRecurrenceHref()).toBe('/recurrences?new=recurrence');
    expect(buildRecurrenceHref('abc')).toBe('/recurrences?edit=abc');
  });

  it('writes dates in Portuguese', () => {
    expect(formatShortDay('2026-11-06')).toBe('06/11');
    expect(formatPeakDay('2026-10-14')).toBe('14 de outubro');
  });
});
