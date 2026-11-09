import { describe, expect, it } from 'vitest';

import { computeSpendingCurve } from '#/modules/dashboard/domain/spending-curve/compute-spending-curve.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const curve = (month: string, today: string, lines: { on: string; cents: number }[]) =>
  computeSpendingCurve({ month: Month.of(month), today: BusinessDate.of(today), lines });

describe('computeSpendingCurve', () => {
  it('accumulates the spending by day against the month before, and has nothing after today', () => {
    const dto = curve('2026-10', '2026-10-03', [
      { on: '2026-10-01', cents: 1000 },
      { on: '2026-10-01', cents: 500 },
      { on: '2026-10-03', cents: 2500 },
      { on: '2026-10-05', cents: 9999 },
      { on: '2026-09-02', cents: 700 },
      { on: '2026-09-30', cents: 100 },
    ]);

    expect(dto.month).toBe('2026-10');
    expect(dto.previousMonth).toBe('2026-09');
    expect(dto.days).toHaveLength(31);
    expect(dto.days.slice(0, 5)).toEqual([
      { day: 1, currentCents: 1500, previousCents: 0 },
      { day: 2, currentCents: 1500, previousCents: 700 },
      { day: 3, currentCents: 4000, previousCents: 700 },
      { day: 4, currentCents: null, previousCents: 700 },
      { day: 5, currentCents: null, previousCents: 700 },
    ]);
  });

  it('has nothing for the day 31 of the month before when it has 30 (31 against 30)', () => {
    const dto = curve('2026-10', '2026-10-31', [{ on: '2026-09-30', cents: 100 }]);

    expect(dto.days[29]).toEqual({ day: 30, currentCents: 0, previousCents: 100 });
    expect(dto.days[30]).toEqual({ day: 31, currentCents: 0, previousCents: null });
  });

  it('is March against a February of 28 or 29 days', () => {
    const march = curve('2026-03', '2026-03-31', []);
    expect(march.days.filter((day) => day.previousCents !== null)).toHaveLength(28);

    const leap = curve('2028-03', '2028-03-31', []);
    expect(leap.days.filter((day) => day.previousCents !== null)).toHaveLength(29);
    expect(leap.previousMonth).toBe('2028-02');
  });

  it('shows the whole of a past month and nothing of a future one', () => {
    const past = curve('2026-09', '2026-10-22', [{ on: '2026-09-30', cents: 300 }]);
    expect(past.days.every((day) => day.currentCents !== null)).toBe(true);
    expect(past.days.at(-1)?.currentCents).toBe(300);

    const future = curve('2026-12', '2026-10-22', []);
    expect(future.days.every((day) => day.currentCents === null)).toBe(true);
    expect(future.days.every((day) => day.previousCents !== null || day.day === 31)).toBe(true);
  });

  it('lets a refund lower the line, and keeps it in whole cents', () => {
    const dto = curve('2026-10', '2026-10-05', [
      { on: '2026-10-01', cents: 5000 },
      { on: '2026-10-02', cents: -1234 },
    ]);

    expect(dto.days.map((day) => day.currentCents).slice(0, 3)).toEqual([5000, 3766, 3766]);
  });

  it('crosses the year', () => {
    expect(curve('2027-01', '2027-01-02', []).previousMonth).toBe('2026-12');
  });
});
