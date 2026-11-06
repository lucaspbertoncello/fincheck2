import { describe, expect, it } from 'vitest';

import { sumCents } from '#/domain/transactions/transaction-split/rules/sum-cents.rule.ts';

describe('sumCents', () => {
  it('adds amounts in integer cents', () => {
    expect(sumCents([10000, 8732])).toBe(18732);
    expect(sumCents([])).toBe(0);
  });
});
