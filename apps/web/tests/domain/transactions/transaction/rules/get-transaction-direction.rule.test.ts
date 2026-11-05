import { describe, expect, it } from 'vitest';

import { getTransactionDirection } from '#/domain/transactions/transaction/rules/get-transaction-direction.rule.ts';

describe('getTransactionDirection', () => {
  it('is income above zero and expense at zero or below', () => {
    expect(getTransactionDirection(1)).toBe('income');
    expect(getTransactionDirection(0)).toBe('expense');
    expect(getTransactionDirection(-1)).toBe('expense');
  });
});
