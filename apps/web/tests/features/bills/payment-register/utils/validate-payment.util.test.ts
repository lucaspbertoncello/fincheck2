import { describe, expect, it } from 'vitest';

import { validatePayment } from '#/features/bills/payment-register/utils/validate-payment.util.ts';

const manual = {
  kind: 'bill',
  amountCents: 5000,
  paidOn: '2026-10-22',
  transactionId: null,
  remainingCents: 18000,
} as const;

describe('validatePayment', () => {
  it('accepts a partial manual payment of a bill', () => {
    expect(validatePayment(manual)).toEqual({
      ok: true,
      body: { amountCents: 5000, paidOn: '2026-10-22' },
    });
  });

  it('sends only the transaction and the amount when a Pix is linked to a bill', () => {
    const result = validatePayment({
      ...manual,
      transactionId: '0b9d6a64-6a0e-4a4c-9d36-6e0c2f3e8d11',
    });
    expect(result).toEqual({
      ok: true,
      body: { transactionId: '0b9d6a64-6a0e-4a4c-9d36-6e0c2f3e8d11', amountCents: 5000 },
    });
  });

  it('asks for an amount and a complete date', () => {
    expect(validatePayment({ ...manual, amountCents: 0, paidOn: '' })).toEqual({
      ok: false,
      errors: {
        amountCents: 'Informe um valor maior que zero',
        paidOn: 'Informe a data completa',
      },
    });
  });

  it('refuses an amount above what is left', () => {
    expect(validatePayment({ ...manual, amountCents: 18001 })).toEqual({
      ok: false,
      errors: { amountCents: 'O valor passa do que falta' },
    });
  });

  it('validates an invoice payment with the invoice schema', () => {
    expect(validatePayment({ ...manual, kind: 'invoice' }).ok).toBe(true);
    expect(validatePayment({ ...manual, kind: 'invoice', paidOn: '' }).ok).toBe(false);
  });
});
