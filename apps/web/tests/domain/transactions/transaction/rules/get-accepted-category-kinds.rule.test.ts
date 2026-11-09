import { describe, expect, it } from 'vitest';

import { getAcceptedCategoryKinds } from '#/domain/transactions/transaction/rules/get-accepted-category-kinds.rule.ts';

const base = {
  nature: 'expense',
  amountCents: -5000,
  isCardAccount: false,
  isSplit: false,
} as const;

describe('getAcceptedCategoryKinds', () => {
  it('takes the kind of the nature in an ordinary account', () => {
    expect(getAcceptedCategoryKinds(base)).toEqual(['expense']);
    expect(getAcceptedCategoryKinds({ ...base, nature: 'income', amountCents: 5000 })).toEqual([
      'income',
    ]);
  });

  it('takes both on a credit on a card, expense first', () => {
    expect(getAcceptedCategoryKinds({ ...base, isCardAccount: true, amountCents: 5990 })).toEqual([
      'expense',
      'income',
    ]);
  });

  it('keeps a credit on a card at both once it became income', () => {
    expect(
      getAcceptedCategoryKinds({
        ...base,
        nature: 'income',
        isCardAccount: true,
        amountCents: 5990,
      }),
    ).toEqual(['expense', 'income']);
  });

  it('takes only expense on a debit on a card', () => {
    expect(getAcceptedCategoryKinds({ ...base, isCardAccount: true })).toEqual(['expense']);
  });

  it('takes none when the nature is outside expense and income, or the transaction is split', () => {
    expect(getAcceptedCategoryKinds({ ...base, nature: 'transfer' })).toEqual([]);
    expect(getAcceptedCategoryKinds({ ...base, nature: 'invoice_payment' })).toEqual([]);
    expect(getAcceptedCategoryKinds({ ...base, isSplit: true })).toEqual([]);
  });
});
