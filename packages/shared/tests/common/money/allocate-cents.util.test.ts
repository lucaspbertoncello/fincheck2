import { describe, expect, it } from 'vitest';

import { allocateCents } from '#/common/money/allocate-cents.util.ts';

describe('allocateCents', () => {
  it('splits evenly when the total divides', () => {
    expect(allocateCents(129900, 12)).toEqual(Array(12).fill(10825));
  });

  it('gives the leftover cents to the first part', () => {
    expect(allocateCents(10000, 3)).toEqual([3334, 3333, 3333]);
  });

  it('always adds up to the total', () => {
    for (const [total, parts] of [
      [1, 2],
      [999, 7],
      [123457, 48],
      [-10000, 3],
    ] as const) {
      expect(allocateCents(total, parts).reduce((sum, part) => sum + part, 0)).toBe(total);
    }
  });

  it('rejects a fractional total and a part count below one', () => {
    expect(() => allocateCents(10.5, 2)).toThrow(RangeError);
    expect(() => allocateCents(100, 0)).toThrow(RangeError);
    expect(() => allocateCents(100, 1.5)).toThrow(RangeError);
  });
});
