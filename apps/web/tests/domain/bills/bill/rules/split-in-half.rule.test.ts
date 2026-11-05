import { describe, expect, it } from 'vitest';

import { splitInHalf } from '#/domain/bills/bill/rules/split-in-half.rule.ts';

describe('splitInHalf', () => {
  it('halves an even amount', () => {
    expect(splitInHalf(10_000)).toBe(5_000);
    expect(splitInHalf(0)).toBe(0);
  });

  it('rounds an odd amount to the nearest cent', () => {
    expect(splitInHalf(10_001)).toBe(5_001);
    expect(splitInHalf(1)).toBe(1);
  });
});
