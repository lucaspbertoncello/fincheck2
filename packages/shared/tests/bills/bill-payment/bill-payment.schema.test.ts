import { describe, expect, it } from 'vitest';

import { createBillPaymentRequestSchema } from '#/bills/bill-payment/bill-payment.schema.ts';

describe('createBillPaymentRequestSchema', () => {
  it('with a transaction, the amount and date are optional', () => {
    expect(
      createBillPaymentRequestSchema.safeParse({
        transactionId: '0194f3a0-0000-7000-8000-000000000001',
      }).success,
    ).toBe(true);
  });

  it('without a transaction, the amount and the date are required', () => {
    expect(createBillPaymentRequestSchema.safeParse({}).success).toBe(false);
    expect(createBillPaymentRequestSchema.safeParse({ amountCents: 15000 }).success).toBe(false);
    expect(
      createBillPaymentRequestSchema.safeParse({ amountCents: 15000, paidOn: '2026-10-20' })
        .success,
    ).toBe(true);
  });

  it('refuses a zero amount', () => {
    expect(
      createBillPaymentRequestSchema.safeParse({ amountCents: 0, paidOn: '2026-10-20' }).success,
    ).toBe(false);
  });
});
