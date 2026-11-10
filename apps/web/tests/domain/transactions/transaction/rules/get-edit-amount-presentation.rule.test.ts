import { describe, expect, it } from 'vitest';

import { getEditAmountPresentation } from '#/domain/transactions/transaction/rules/get-edit-amount-presentation.rule.ts';

const base = {
  nature: 'expense',
  amountCents: -5990,
  isCardAccount: false,
  categoryKind: null,
} as const;

const credit = { ...base, amountCents: 5990, isCardAccount: true } as const;

describe('getEditAmountPresentation', () => {
  it('draws an ordinary expense as "−" in the tone of expense, with no note', () => {
    expect(getEditAmountPresentation(base)).toEqual({ sign: '−', tone: 'expense', note: null });
    expect(getEditAmountPresentation({ ...base, categoryKind: 'expense' }).note).toBeNull();
  });

  it('draws an ordinary income as "+" in the tone of income', () => {
    expect(getEditAmountPresentation({ ...base, nature: 'income', amountCents: 9000 })).toEqual({
      sign: '+',
      tone: 'income',
      note: null,
    });
  });

  it('draws a debit on a card as an expense', () => {
    expect(getEditAmountPresentation({ ...base, isCardAccount: true })).toEqual({
      sign: '−',
      tone: 'expense',
      note: null,
    });
  });

  it('keeps the direction of a transfer, whichever way it goes', () => {
    expect(getEditAmountPresentation({ ...base, nature: 'transfer' }).sign).toBe('−');
    expect(getEditAmountPresentation({ ...base, nature: 'transfer', amountCents: 100 }).sign).toBe(
      '+',
    );
  });

  it('draws a credit on a card as "+" in the tone of income even as an expense, with no note without a category', () => {
    expect(getEditAmountPresentation(credit)).toEqual({ sign: '+', tone: 'income', note: null });
  });

  it('says a credit on a card abates the spending when its category is of expense', () => {
    expect(getEditAmountPresentation({ ...credit, categoryKind: 'expense' })).toEqual({
      sign: '+',
      tone: 'income',
      note: 'abate gasto',
    });
  });

  it('adds no note to a credit on a card with a category of income', () => {
    expect(getEditAmountPresentation({ ...credit, categoryKind: 'income' })).toEqual({
      sign: '+',
      tone: 'income',
      note: null,
    });
    expect(
      getEditAmountPresentation({ ...credit, nature: 'income', categoryKind: 'income' }).note,
    ).toBeNull();
  });
});
