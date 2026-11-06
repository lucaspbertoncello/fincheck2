import { describe, expect, it } from 'vitest';

import { distributeCents } from '#/domain/transactions/transaction-split/rules/distribute-cents.rule.ts';
import { sumCents } from '#/domain/transactions/transaction-split/rules/sum-cents.rule.ts';

describe('distributeCents', () => {
  it('gives the leftover cents one by one to the first parts', () => {
    expect(distributeCents(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(distributeCents(100, 3)).toEqual([34, 33, 33]);
    expect(distributeCents(1, 2)).toEqual([1, 0]);
  });

  it('always adds up to the total, to the cent', () => {
    for (const total of [0, 1, 7, 99, 10001, 18732, 123456789]) {
      for (const count of [1, 2, 3, 4, 5, 6, 7]) {
        const parts = distributeCents(total, count);
        expect(parts).toHaveLength(count);
        expect(sumCents(parts)).toBe(total);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('refuses invalid input', () => {
    expect(distributeCents(-1, 2)).toEqual([]);
    expect(distributeCents(100, 0)).toEqual([]);
    expect(distributeCents(10.5, 2)).toEqual([]);
    expect(distributeCents(100, 1.5)).toEqual([]);
  });
});
