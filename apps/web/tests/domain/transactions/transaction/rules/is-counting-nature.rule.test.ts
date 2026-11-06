import { describe, expect, it } from 'vitest';

import { isCountingNature } from '#/domain/transactions/transaction/rules/is-counting-nature.rule.ts';

describe('isCountingNature', () => {
  it('counts only expense and income in the month', () => {
    expect(isCountingNature('expense')).toBe(true);
    expect(isCountingNature('income')).toBe(true);
    expect(isCountingNature('transfer')).toBe(false);
    expect(isCountingNature('invoice_payment')).toBe(false);
    expect(isCountingNature('balance_adjustment')).toBe(false);
  });
});
