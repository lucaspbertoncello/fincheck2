import { describe, expect, it } from 'vitest';

import { assertTransactionCanBeOrigin } from '#/modules/bills/domain/bill/assert-transaction-can-be-origin.util.ts';
import { BillOriginTransactionInvalidError } from '#/modules/bills/domain/bill/bill-origin-transaction-invalid.error.ts';

const expense = { amountCents: -30000, nature: 'expense', counts: true, isSplit: false };

describe('assertTransactionCanBeOrigin', () => {
  it('takes a whole debit of nature expense that counts', () => {
    expect(() => {
      assertTransactionCanBeOrigin(expense);
    }).not.toThrow();
  });

  it.each([
    ['a credit', { ...expense, amountCents: 30000 }],
    ['zero', { ...expense, amountCents: 0 }],
    ['an income', { ...expense, amountCents: 30000, nature: 'income' }],
    ['one already lent', { ...expense, nature: 'lent' }],
    ['one that does not count', { ...expense, counts: false }],
    ['one already split', { ...expense, isSplit: true }],
  ])('refuses %s', (_name, input) => {
    expect(() => {
      assertTransactionCanBeOrigin(input);
    }).toThrow(BillOriginTransactionInvalidError);
  });
});
