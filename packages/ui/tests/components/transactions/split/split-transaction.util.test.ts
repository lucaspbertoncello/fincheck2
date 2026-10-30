import { describe, expect, it } from 'vitest';

import {
  balanceSplitParts,
  checkSplit,
  distributeCents,
  sumCents,
} from '#/components/transactions/index.ts';

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

describe('checkSplit', () => {
  it('matches when the parts add up to the total', () => {
    const check = checkSplit(18732, [10000, 8732]);
    expect(check).toMatchObject({ status: 'matches', differenceCents: 0, valid: true });
  });

  it('says how much is short or over', () => {
    expect(checkSplit(18732, [10000, 8000])).toMatchObject({
      status: 'short',
      differenceCents: 732,
      valid: false,
    });
    expect(checkSplit(18732, [10000, 9000])).toMatchObject({
      status: 'over',
      differenceCents: -268,
      valid: false,
    });
  });

  it('is invalid with one part, an empty part or a zero total', () => {
    expect(checkSplit(100, [100]).valid).toBe(false);
    const withEmpty = checkSplit(100, [100, 0]);
    expect(withEmpty.valid).toBe(false);
    expect(withEmpty.emptyPartIndexes).toEqual([1]);
    expect(checkSplit(0, [0, 0]).valid).toBe(false);
  });

  it('is invalid with fractional cents', () => {
    expect(checkSplit(100, [50.5, 49.5]).valid).toBe(false);
  });
});

describe('balanceSplitParts', () => {
  it('gives the rest to the other part in a two-part split', () => {
    expect(balanceSplitParts(10000, [5000, 5000], 0, 3000)).toEqual([3000, 7000]);
    expect(balanceSplitParts(10000, [5000, 5000], 1, 3001)).toEqual([6999, 3001]);
  });

  it('keeps the amount between zero and the total', () => {
    expect(balanceSplitParts(10000, [5000, 5000], 0, 99999)).toEqual([10000, 0]);
    expect(balanceSplitParts(10000, [5000, 5000], 0, -5)).toEqual([0, 10000]);
  });

  it('changes only the edited part with three or more', () => {
    expect(balanceSplitParts(10000, [3334, 3333, 3333], 1, 1000)).toEqual([3334, 1000, 3333]);
  });
});
