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

  describe('a transfer that carries the category that is a transfer', () => {
    const rotation = makeTransaction({
      nature: 'transfer',
      categoryId: 'rotation',
      amountCents: -5000,
    });
    const asRotation = {
      ...values,
      nature: 'transfer' as const,
      categoryId: 'rotation',
    };

    it('choosing the other leg sends the nature with it and keeps the category', () => {
      expect(buildUpdateBody(rotation, { ...asRotation, counterpartId: 'trx-2' }, [])).toEqual({
        nature: 'transfer',
        transferCounterpartId: 'trx-2',
      });
    });

    it('taking the category off sends only that (the nature goes back by the sign)', () => {
      expect(
        buildUpdateBody(rotation, { ...asRotation, categoryId: null, counterpartId: 'trx-2' }, []),
      ).toEqual({ categoryId: null });
    });

    it('swapping it for another transfer category sends the new one', () => {
      expect(buildUpdateBody(rotation, { ...asRotation, categoryId: 'other' }, [])).toEqual({
        categoryId: 'other',
      });
    });

    it('turning it into an expense sends the nature and does not send a category too', () => {
      expect(
        buildUpdateBody(rotation, { ...values, nature: 'expense', categoryId: null }, []),
      ).toEqual({ nature: 'expense' });
    });

    it('picking it on an expense sends the category', () => {
      expect(buildUpdateBody(base, { ...values, categoryId: 'rotation' }, ['t1'])).toEqual({
        categoryId: 'rotation',
      });
    });
  });

  it('a transfer with no link: choosing the other leg sends the nature with it', () => {
    const unlinked = makeTransaction({ nature: 'transfer', categoryId: null });
    const body = buildUpdateBody(
      unlinked,
      { ...values, nature: 'transfer', categoryId: null, counterpartId: 'trx-2' },
      [],
    );
    expect(body).toEqual({ nature: 'transfer', transferCounterpartId: 'trx-2' });
  });
});
