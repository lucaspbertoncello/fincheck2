import { describe, expect, it } from 'vitest';

import { computeAmountMatch } from '#/modules/recurrences/domain/matching/compute-amount-match.util.ts';

describe('computeAmountMatch', () => {
  it('matches a value within 15% of a target, on the edge included', () => {
    expect(computeAmountMatch(85000 + 12750, [85000]).matches).toBe(true);
    expect(computeAmountMatch(85000 - 12750, [85000]).matches).toBe(true);
    expect(computeAmountMatch(85000 + 12751, [85000]).matches).toBe(false);
    expect(computeAmountMatch(85000 - 12751, [85000]).matches).toBe(false);
  });

  it('is exact within R$ 1,00 of a target, on the edge included', () => {
    expect(computeAmountMatch(77700 + 100, [77700]).exact).toBe(true);
    expect(computeAmountMatch(77700 - 100, [77700]).exact).toBe(true);
    expect(computeAmountMatch(77700 + 101, [77700]).exact).toBe(false);
  });

  it('is exact on any target of the list, and matches on any of them', () => {
    expect(computeAmountMatch(42500, [85000, 85000, 42500])).toEqual({
      matches: true,
      exact: true,
    });
    expect(computeAmountMatch(60000, [85000, 42500])).toEqual({ matches: false, exact: false });
  });

  it('is exact for a small target even when 15% is less than R$ 1,00', () => {
    // 15% of R$ 5,00 is 0,75: a payment of R$ 5,90 is within R$ 1,00 and outside 15%.
    expect(computeAmountMatch(590, [500])).toEqual({ matches: false, exact: true });
  });

  it('ignores a target that is not positive', () => {
    expect(computeAmountMatch(100, [0, -5])).toEqual({ matches: false, exact: false });
  });
});
