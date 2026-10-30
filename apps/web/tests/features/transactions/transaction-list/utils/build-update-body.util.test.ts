import { describe, expect, it } from 'vitest';

import { buildUpdateBody } from '#/features/transactions/transaction-list/utils/build-update-body.util.ts';
import { makeTransaction } from '#tests/support/transactions/make-transaction.util.ts';

const base = makeTransaction({ tagIds: ['t1'] });
const values = {
  description: 'PADARIA',
  amountCents: 5000,
  date: '2026-10-20',
  categoryId: 'cat-1',
  tags: [],
  nature: 'expense' as const,
  counterpartId: null,
};

describe('buildUpdateBody', () => {
  it('is null when nothing changed', () => {
    expect(buildUpdateBody(base, values, ['t1'])).toBeNull();
  });

  it('sends only what changed, with the amount positive', () => {
    const body = buildUpdateBody(
      base,
      { ...values, description: ' Padaria nova ', amountCents: 6000 },
      ['t1'],
    );
    expect(body).toEqual({ description: 'Padaria nova', amountCents: 6000 });
  });

  it('sends the category and the whole set of tags', () => {
    expect(buildUpdateBody(base, { ...values, categoryId: null }, ['t1', 't2'])).toEqual({
      categoryId: null,
      tagIds: ['t1', 't2'],
    });
  });

  it('marking a transfer sends the other leg and no category (R6)', () => {
    const body = buildUpdateBody(
      base,
      { ...values, nature: 'transfer', categoryId: null, counterpartId: 'trx-2' },
      ['t1'],
    );
    expect(body).toEqual({ nature: 'transfer', transferCounterpartId: 'trx-2' });
  });

  it('a transaction out of the account going back to expense sends the nature (R6)', () => {
    const outside = makeTransaction({ nature: 'invoice_payment', categoryId: null });
    const body = buildUpdateBody(outside, { ...values, nature: 'expense', categoryId: null }, []);
    expect(body).toEqual({ nature: 'expense' });
  });

  it('keeping "Fora da conta" never sends a nature', () => {
    const outside = makeTransaction({ nature: 'lent', categoryId: null });
    expect(
      buildUpdateBody(outside, { ...values, nature: 'out_of_account', categoryId: null }, []),
    ).toBeNull();
  });
});
