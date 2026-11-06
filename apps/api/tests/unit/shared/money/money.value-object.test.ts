import { describe, expect, it } from 'vitest';

import { Money } from '#/shared/money/money.value-object.ts';

const cents = (parts: Money[]) => parts.map((part) => part.cents);

describe('Money', () => {
  it('adds, subtracts and negates in whole cents', () => {
    const a = Money.fromCents(1050);
    const b = Money.fromCents(275);

    expect(a.add(b).cents).toBe(1325);
    expect(a.subtract(b).cents).toBe(775);
    expect(b.subtract(a).cents).toBe(-775);
    expect(a.negate().cents).toBe(-1050);
  });

  it('does not suffer the float error of 0.1 + 0.2', () => {
    expect(Money.fromCents(10).add(Money.fromCents(20)).cents).toBe(30);
  });

  it('knows zero, the sign and equality', () => {
    expect(Money.zero().isZero()).toBe(true);
    expect(Money.fromCents(5).subtract(Money.fromCents(5)).isZero()).toBe(true);
    expect(Money.fromCents(-1).isNegative()).toBe(true);
    expect(Money.fromCents(1).isNegative()).toBe(false);
    expect(Money.fromCents(7).equals(Money.fromCents(7))).toBe(true);
  });

  it('never keeps a negative zero', () => {
    expect(Object.is(Money.zero().negate().cents, 0)).toBe(true);
  });

  it('is immutable: an operation leaves the original alone', () => {
    const a = Money.fromCents(100);
    a.add(Money.fromCents(1));

    expect(a.cents).toBe(100);
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60])('refuses %s cents', (value) => {
    expect(() => Money.fromCents(value)).toThrow(RangeError);
  });

  describe('allocate', () => {
    it('gives the leftover cents to the first part (100,00 in 3)', () => {
      expect(cents(Money.fromCents(10000).allocate(3))).toEqual([3334, 3333, 3333]);
    });

    it('splits evenly when there is no leftover (3.200,00 in 10)', () => {
      expect(cents(Money.fromCents(320000).allocate(10))).toEqual(
        Array.from({ length: 10 }, () => 32000),
      );
    });

    it('splits 1.299,00 in 12 with the leftover on the first part', () => {
      // 129900 / 12 = 10825 exactly: 12 x 108,25 has no leftover.
      expect(cents(Money.fromCents(129900).allocate(12))).toEqual(
        Array.from({ length: 12 }, () => 10825),
      );
      expect(cents(Money.fromCents(129901).allocate(12))).toEqual([
        10826,
        ...Array.from({ length: 11 }, () => 10825),
      ]);
    });

    it('always adds up to the total, also for a negative amount', () => {
      for (const total of [10000, -10000, 1, -1, 999999, 0]) {
        for (const parts of [1, 2, 3, 7, 48]) {
          const sum = Money.fromCents(total)
            .allocate(parts)
            .reduce((acc, part) => acc.add(part), Money.zero());
          expect(sum.cents).toBe(total);
        }
      }
    });

    it('puts the leftover of a negative amount on the first part too', () => {
      expect(cents(Money.fromCents(-10000).allocate(3))).toEqual([-3334, -3333, -3333]);
    });

    it('refuses fewer than one part', () => {
      expect(() => Money.fromCents(100).allocate(0)).toThrow(RangeError);
    });
  });
});
