import { describe, expect, it } from 'vitest';

import { computePaymentCents } from '#/modules/bills/domain/bill-payment/compute-payment-cents.util.ts';

const transaction = (patch: Partial<{ amountCents: number; nature: string; counts: boolean }>) => ({
  amountCents: -15000,
  nature: 'expense',
  counts: true,
  ...patch,
});

describe('computePaymentCents', () => {
  it('a payment by hand is worth what was recorded', () => {
    expect(computePaymentCents({ recordedCents: 7000, transaction: 'manual' })).toBe(7000);
  });

  it('a linked one is worth what was recorded while the transaction is as big', () => {
    expect(computePaymentCents({ recordedCents: 15000, transaction: transaction({}) })).toBe(15000);
  });

  it('follows the transaction down when it is corrected to a smaller value', () => {
    expect(
      computePaymentCents({
        recordedCents: 15000,
        transaction: transaction({ amountCents: -9000 }),
      }),
    ).toBe(9000);
  });

  it('does not follow it up: it never passes what was recorded', () => {
    expect(
      computePaymentCents({
        recordedCents: 15000,
        transaction: transaction({ amountCents: -20000 }),
      }),
    ).toBe(15000);
  });

  it('is zero when the transaction does not count (ignored or removed by the bank)', () => {
    expect(
      computePaymentCents({ recordedCents: 15000, transaction: transaction({ counts: false }) }),
    ).toBe(0);
  });

  it('is zero when the transaction is gone', () => {
    expect(computePaymentCents({ recordedCents: 15000, transaction: null })).toBe(0);
  });

  it('is zero when the nature turned into one that pays nothing', () => {
    expect(
      computePaymentCents({
        recordedCents: 15000,
        transaction: transaction({ nature: 'transfer' }),
      }),
    ).toBe(0);
  });

  it('counts the money that came back from a friend (reimbursed) and the income', () => {
    expect(
      computePaymentCents({
        recordedCents: 5800,
        transaction: transaction({ amountCents: 5800, nature: 'reimbursed' }),
      }),
    ).toBe(5800);
    expect(
      computePaymentCents({
        recordedCents: 5800,
        transaction: transaction({ amountCents: 10000, nature: 'income' }),
      }),
    ).toBe(5800);
  });
});
