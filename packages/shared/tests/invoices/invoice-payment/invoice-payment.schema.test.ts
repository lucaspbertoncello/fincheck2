import { describe, expect, it } from 'vitest';

import { createInvoicePaymentRequestSchema } from '#/invoices/invoice-payment/invoice-payment.schema.ts';

describe('createInvoicePaymentRequestSchema', () => {
  it('needs a positive amount and a date; the transaction is optional', () => {
    expect(
      createInvoicePaymentRequestSchema.safeParse({ amountCents: 50000, paidOn: '2026-10-21' })
        .success,
    ).toBe(true);
    expect(
      createInvoicePaymentRequestSchema.safeParse({
        amountCents: 128490,
        paidOn: '2026-10-21',
        transactionId: '0194f3a0-0000-7000-8000-000000000001',
      }).success,
    ).toBe(true);
  });

  it('refuses zero, fractions and a missing date', () => {
    expect(
      createInvoicePaymentRequestSchema.safeParse({ amountCents: 0, paidOn: '2026-10-21' }).success,
    ).toBe(false);
    expect(
      createInvoicePaymentRequestSchema.safeParse({ amountCents: 10.5, paidOn: '2026-10-21' })
        .success,
    ).toBe(false);
    expect(createInvoicePaymentRequestSchema.safeParse({ amountCents: 100 }).success).toBe(false);
  });
});
