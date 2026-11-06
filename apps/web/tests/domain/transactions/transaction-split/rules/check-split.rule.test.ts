import { describe, expect, it } from 'vitest';

import { checkSplit } from '#/domain/transactions/transaction-split/rules/check-split.rule.ts';

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
