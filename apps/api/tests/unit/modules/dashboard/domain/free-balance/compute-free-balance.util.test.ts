import { describe, expect, it } from 'vitest';

import { computeDaysRemaining } from '#/modules/dashboard/domain/free-balance/compute-days-remaining.util.ts';
import { computeFreeBalance } from '#/modules/dashboard/domain/free-balance/compute-free-balance.util.ts';
import { computePerDay } from '#/modules/dashboard/domain/free-balance/compute-per-day.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { buildTestAgendaEntry } from '#tests/support/dashboard/agenda/build-test-agenda-entry.util.ts';

const day = (value: string) => BusinessDate.of(value);

describe('computeFreeBalance', () => {
  it('is the balance + what comes in - what goes out, on the numbers of the contract (R$ 7.707,29)', () => {
    const result = computeFreeBalance({
      accountsTotal: Money.fromCents(540898),
      today: day('2026-10-22'),
      entries: [
        buildTestAgendaEntry({ key: 'a', flow: 'in', remainingCents: 420000 }),
        buildTestAgendaEntry({ key: 'b', flow: 'in', remainingCents: 42500 }),
        buildTestAgendaEntry({ key: 'c', flow: 'out', remainingCents: 161689 }),
        buildTestAgendaEntry({ key: 'd', flow: 'out', remainingCents: 40980 }),
        buildTestAgendaEntry({ key: 'e', flow: 'out', remainingCents: 30000 }),
      ],
    });

    expect(result.receivableTotal.cents).toBe(462500);
    expect(result.payableTotal.cents).toBe(232669);
    expect(result.free.cents).toBe(770729);
    expect(result.daysRemaining).toBe(10);
    expect(result.perDay.cents).toBe(77073);
  });

  it('counts only what the item says counts, and only what is left of it', () => {
    const result = computeFreeBalance({
      accountsTotal: Money.fromCents(100000),
      today: day('2026-10-22'),
      entries: [
        buildTestAgendaEntry({ key: 'counts', flow: 'out', remainingCents: 5000 }),
        buildTestAgendaEntry({
          key: 'no',
          flow: 'out',
          remainingCents: 9000,
          countsInFreeBalance: false,
        }),
        buildTestAgendaEntry({ key: 'zero', flow: 'out', remainingCents: 0 }),
        buildTestAgendaEntry({
          key: 'friend',
          flow: 'in',
          remainingCents: 7000,
          countsInFreeBalance: false,
        }),
      ],
    });

    expect(result.free.cents).toBe(95000);
    expect(result.payable.map((item) => item.key)).toEqual(['counts']);
    expect(result.receivable).toEqual([]);
  });

  it('can be negative, and its movements are signed', () => {
    const result = computeFreeBalance({
      accountsTotal: Money.fromCents(1000),
      today: day('2026-10-31'),
      entries: [
        buildTestAgendaEntry({ key: 'a', flow: 'out', remainingCents: 5000, dueOn: null }),
        buildTestAgendaEntry({ key: 'b', flow: 'in', remainingCents: 2000, dueOn: '2026-10-31' }),
      ],
    });

    expect(result.free.cents).toBe(-2000);
    expect(result.daysRemaining).toBe(1);
    expect(result.perDay.cents).toBe(-2000);
    expect(result.movements).toEqual([
      { dueOn: '2026-10-31', cents: 2000 },
      { dueOn: null, cents: -5000 },
    ]);
  });
});

describe('computeDaysRemaining', () => {
  it.each([
    ['2026-10-22', 10],
    ['2026-10-31', 1],
    ['2026-10-01', 31],
    ['2026-11-30', 1],
    ['2026-11-01', 30],
    ['2026-02-28', 1],
    ['2026-02-01', 28],
    ['2028-02-29', 1],
    ['2028-02-01', 29],
  ])('counts today in the days left of %s: %i', (today, expected) => {
    expect(computeDaysRemaining(day(today))).toBe(expected);
  });
});

describe('computePerDay', () => {
  it('rounds to the cent with the half going up', () => {
    expect(computePerDay(Money.fromCents(770729), 10).cents).toBe(77073);
    expect(computePerDay(Money.fromCents(770724), 10).cents).toBe(77072);
    // 10 cents in 4 days is 2.5 cents: up.
    expect(computePerDay(Money.fromCents(10), 4).cents).toBe(3);
    expect(computePerDay(Money.fromCents(9), 4).cents).toBe(2);
  });

  it('rounds the half of a negative toward zero (up), and keeps whole cents', () => {
    expect(computePerDay(Money.fromCents(-10), 4).cents).toBe(-2);
    expect(computePerDay(Money.fromCents(-11), 4).cents).toBe(-3);
    expect(computePerDay(Money.fromCents(-770729), 10).cents).toBe(-77073);
    expect(Number.isInteger(computePerDay(Money.fromCents(123457), 7).cents)).toBe(true);
  });

  it('is zero (not -0) for a zero Livre', () => {
    expect(Object.is(computePerDay(Money.zero(), 10).cents, 0)).toBe(true);
  });

  it('refuses a number of days that is not a positive integer', () => {
    expect(() => computePerDay(Money.fromCents(1), 0)).toThrow(RangeError);
    expect(() => computePerDay(Money.fromCents(1), 1.5)).toThrow(RangeError);
  });
});
