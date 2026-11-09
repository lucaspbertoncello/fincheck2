import type { TransactionEditValues } from '@fincheck/ui';
import { describe, expect, it } from 'vitest';

import { validateTransactionEdit } from '#/domain/transactions/transaction/rules/validate-transaction-edit.rule.ts';

const values: TransactionEditValues = {
  description: 'Padaria Estrela',
  amountCents: 4590,
  date: '2026-10-19',
  categoryId: 'food',
  tags: ['padaria'],
  nature: 'expense',
  counterpartId: null,
};

describe('validateTransactionEdit', () => {
  it('accepts a complete transaction', () => {
    expect(validateTransactionEdit(values)).toEqual({});
  });

  it('flags an empty description, a zero amount and a bad date', () => {
    const errors = validateTransactionEdit({
      ...values,
      description: '   ',
      amountCents: 0,
      date: '2026-02-31',
    });

    expect(errors.description).toBeDefined();
    expect(errors.amount).toBeDefined();
    expect(errors.date).toBeDefined();
  });

  it('flags a transfer with no other leg', () => {
    expect(validateTransactionEdit({ ...values, nature: 'transfer' }).counterpart).toBeDefined();
    expect(
      validateTransactionEdit({ ...values, nature: 'transfer', counterpartId: 'leg-1' }),
    ).toEqual({});
  });

  it('does not ask for the other leg of a transfer that is one by its category', () => {
    const rotation = { ...values, nature: 'transfer' as const, categoryId: 'rotation' };

    expect(validateTransactionEdit(rotation, { legOptional: true })).toEqual({});
    expect(validateTransactionEdit(rotation).counterpart).toBeDefined();
  });
});
