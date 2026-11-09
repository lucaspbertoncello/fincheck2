import { describe, expect, it } from 'vitest';

import { computeComparisonWindow } from '#/modules/dashboard/domain/month-comparison/compute-comparison-window.util.ts';
import { roundPct } from '#/modules/dashboard/domain/month-comparison/round-pct.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const window = (month: string, today: string) => {
  const result = computeComparisonWindow(Month.of(month), BusinessDate.of(today));

  return {
    isCurrentMonth: result.isCurrentMonth,
    from: result.fromOn.value,
    asOf: result.asOfOn.value,
    previousFrom: result.previousFromOn.value,
    previousUntil: result.previousUntilOn.value,
  };
};

describe('computeComparisonWindow', () => {
  it('compares day 1 to today with day 1 to the same day of the month before (22/10 against 22/09)', () => {
    expect(window('2026-10', '2026-10-22')).toEqual({
      isCurrentMonth: true,
      from: '2026-10-01',
      asOf: '2026-10-22',
      previousFrom: '2026-09-01',
      previousUntil: '2026-09-22',
    });
  });

  it('holds the day at the end of a month before that is shorter: 30/03 against February', () => {
    expect(window('2026-03', '2026-03-30').previousUntil).toBe('2026-02-28');
    expect(window('2028-03', '2028-03-30').previousUntil).toBe('2028-02-29');
    expect(window('2026-03', '2026-03-31').previousUntil).toBe('2026-02-28');
  });

  it('holds 31/10 to 30/09 and keeps 29, 30 and 31 where the month before has them', () => {
    expect(window('2026-10', '2026-10-31').previousUntil).toBe('2026-09-30');
    expect(window('2026-12', '2026-12-31').previousUntil).toBe('2026-11-30');
    expect(window('2026-04', '2026-04-29').previousUntil).toBe('2026-03-29');
    expect(window('2026-05', '2026-05-31').previousUntil).toBe('2026-04-30');
  });

  it('crosses the year', () => {
    expect(window('2027-01', '2027-01-15')).toMatchObject({
      previousFrom: '2026-12-01',
      previousUntil: '2026-12-15',
    });
  });

  it('compares a past month as a whole against the whole month before, however long each is', () => {
    expect(window('2026-02', '2026-10-22')).toEqual({
      isCurrentMonth: false,
      from: '2026-02-01',
      asOf: '2026-02-28',
      previousFrom: '2026-01-01',
      previousUntil: '2026-01-31',
    });
    expect(window('2026-03', '2026-10-22').previousUntil).toBe('2026-02-28');
  });

  it('puts a future month at its first day, against the first day of the month before', () => {
    expect(window('2026-12', '2026-10-22')).toEqual({
      isCurrentMonth: false,
      from: '2026-12-01',
      asOf: '2026-12-01',
      previousFrom: '2026-11-01',
      previousUntil: '2026-11-01',
    });
  });

  it('uses the day of São Paulo: the clock gives 23:59 as the same day and 00:00 as the next', () => {
    // The clock turns an instant into a day; the window only follows that day.
    expect(window('2026-10', '2026-10-31').asOf).toBe('2026-10-31');
    expect(window('2026-11', '2026-11-01')).toMatchObject({
      isCurrentMonth: true,
      asOf: '2026-11-01',
    });
    expect(window('2026-10', '2026-11-01').isCurrentMonth).toBe(false);
  });
});

describe('roundPct', () => {
  it('is the numerator as a percentage of the denominator with one decimal', () => {
    // The example of BR-DSH-011: R$ 3.486,20 against September until the 22nd: +9.9%.
    expect(roundPct(348620 - 317200, 317200)).toBe(9.9);
    expect(roundPct(1, 3)).toBe(33.3);
    expect(roundPct(2, 3)).toBe(66.7);
  });

  it('sends the half away from zero, in whole cents (no float surprise)', () => {
    expect(roundPct(1, 8)).toBe(12.5);
    expect(roundPct(995, 10000)).toBe(10);
    expect(roundPct(-995, 10000)).toBe(-10);
    expect(roundPct(-1, 3)).toBe(-33.3);
  });

  it('is null when there is nothing to compare with', () => {
    expect(roundPct(500, 0)).toBeNull();
    expect(roundPct(500, -100)).toBeNull();
  });

  it('is zero (not -0) for no change, and for a drop that rounds to nothing', () => {
    expect(Object.is(roundPct(0, 1000), 0)).toBe(true);
    // -1 cent against R$ 10.000,00 is -0,0001%: one decimal, so zero.
    expect(Object.is(roundPct(-1, 1_000_000), 0)).toBe(true);
  });
});
