import { describe, expect, it } from 'vitest';

import { computeLandingDate } from '#/modules/dashboard/domain/timeline/compute-landing-date.util.ts';
import { projectBalances } from '#/modules/dashboard/domain/timeline/project-balances.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const day = (value: string) => BusinessDate.of(value);

describe('computeLandingDate', () => {
  const today = day('2026-10-22');
  const last = day('2026-10-31');

  it('keeps the own day, moves a day that passed to today and one with no day or after the month to the last day', () => {
    expect(computeLandingDate('2026-10-25', today, last)).toBe('2026-10-25');
    expect(computeLandingDate('2026-10-22', today, last)).toBe('2026-10-22');
    expect(computeLandingDate('2026-10-31', today, last)).toBe('2026-10-31');
    expect(computeLandingDate('2026-10-05', today, last)).toBe('2026-10-22');
    expect(computeLandingDate('2026-09-01', today, last)).toBe('2026-10-22');
    expect(computeLandingDate(null, today, last)).toBe('2026-10-31');
    // The card that closes on the 30th and falls due on the 6th: the invoice lands on the last day.
    expect(computeLandingDate('2026-11-06', today, last)).toBe('2026-10-31');
  });
});

describe('projectBalances', () => {
  it('starts today with the balance and adds what comes in and takes what goes out, day by day', () => {
    const balances = projectBalances({
      opening: Money.fromCents(100000),
      today: day('2026-10-28'),
      movements: [
        { dueOn: '2026-10-28', cents: -10000 },
        { dueOn: '2026-10-30', cents: 50000 },
        { dueOn: '2026-10-30', cents: -20000 },
      ],
    });

    expect([...balances.entries()].map(([date, money]) => [date, money.cents])).toEqual([
      ['2026-10-28', 90000],
      ['2026-10-29', 90000],
      ['2026-10-30', 120000],
      ['2026-10-31', 120000],
    ]);
  });

  it('puts the late ones today, and the ones with no day or past the month on the last day: the last day is the Livre', () => {
    const opening = Money.fromCents(540898);
    const movements = [
      { dueOn: '2026-10-05', cents: -18000 },
      { dueOn: '2026-10-25', cents: -10990 },
      { dueOn: null, cents: 42500 },
      { dueOn: '2026-11-06', cents: -161689 },
      { dueOn: '2026-10-25', cents: 420000 },
    ];

    const balances = projectBalances({ opening, movements, today: day('2026-10-22') });

    expect(balances.get('2026-10-22')?.cents).toBe(540898 - 18000);
    expect(balances.get('2026-10-25')?.cents).toBe(540898 - 18000 - 10990 + 420000);
    expect(balances.get('2026-10-30')?.cents).toBe(540898 - 18000 - 10990 + 420000);
    const livre = movements.reduce((total, movement) => total + movement.cents, opening.cents);
    expect(balances.get('2026-10-31')?.cents).toBe(livre);
    expect(balances.size).toBe(10);
  });

  it('has one day when today is the last day of the month (and of a leap February)', () => {
    expect(
      projectBalances({
        opening: Money.fromCents(1),
        today: day('2026-10-31'),
        movements: [{ dueOn: '2026-11-02', cents: -5 }],
      }).get('2026-10-31')?.cents,
    ).toBe(-4);
    expect(
      projectBalances({ opening: Money.zero(), today: day('2028-02-29'), movements: [] }).size,
    ).toBe(1);
  });

  it('does not project the days before today', () => {
    const balances = projectBalances({
      opening: Money.zero(),
      today: day('2026-10-22'),
      movements: [],
    });

    expect(balances.has('2026-10-21')).toBe(false);
    expect(balances.has('2026-10-22')).toBe(true);
  });
});
