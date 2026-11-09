import { describe, expect, it } from 'vitest';

import { getCommonCategoryKinds } from '#/domain/transactions/transaction/rules/get-common-category-kinds.rule.ts';

const debit = {
  nature: 'expense',
  amountCents: -5000,
  isCardAccount: false,
  isSplit: false,
} as const;
const deposit = {
  nature: 'income',
  amountCents: 5000,
  isCardAccount: false,
  isSplit: false,
} as const;
const cardCredit = {
  nature: 'expense',
  amountCents: 5990,
  isCardAccount: true,
  isSplit: false,
} as const;
const cardDebit = { ...debit, isCardAccount: true } as const;
const transfer = { ...debit, nature: 'transfer' } as const;

describe('getCommonCategoryKinds', () => {
  it('offers both kinds only when every transaction is a credit on a card', () => {
    expect(getCommonCategoryKinds([cardCredit, cardCredit])).toEqual(['expense', 'income']);
  });

  it('narrows to the kind that serves all of a mixed selection', () => {
    expect(getCommonCategoryKinds([cardCredit, debit])).toEqual(['expense']);
    expect(getCommonCategoryKinds([cardCredit, cardDebit])).toEqual(['expense']);
    expect(getCommonCategoryKinds([cardCredit, deposit])).toEqual(['income']);
  });

  it('is empty when expenses and incomes are mixed', () => {
    expect(getCommonCategoryKinds([debit, deposit])).toEqual([]);
  });

  it('does not let a transaction that takes no category narrow the choice', () => {
    expect(getCommonCategoryKinds([cardCredit, transfer])).toEqual(['expense', 'income']);
    expect(getCommonCategoryKinds([transfer])).toEqual([]);
    expect(getCommonCategoryKinds([])).toEqual([]);
  });
});
