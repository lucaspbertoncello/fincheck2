import { describe, expect, it } from 'vitest';

import { balanceSplitParts } from '#/domain/transactions/transaction-split/rules/balance-split-parts.rule.ts';

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
