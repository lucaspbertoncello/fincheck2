import { describe, expect, it } from 'vitest';

import { assertTransactionCanPayBill } from '#/modules/bills/domain/bill-payment/assert-transaction-can-pay-bill.util.ts';
import { BillPaymentTransactionInvalidError } from '#/modules/bills/domain/bill-payment/bill-payment-transaction-invalid.error.ts';

const debit = { amountCents: -15000, nature: 'expense', counts: true, isSplit: false };
const credit = { amountCents: 15000, nature: 'income', counts: true, isSplit: false };

describe('assertTransactionCanPayBill', () => {
  it('a payable bill takes a debit of nature expense', () => {
    expect(() => {
      assertTransactionCanPayBill({ direction: 'payable', ...debit });
    }).not.toThrow();
  });

  it('a receivable bill takes a credit of nature income', () => {
    expect(() => {
      assertTransactionCanPayBill({ direction: 'receivable', ...credit });
    }).not.toThrow();
  });

  it.each([
    ['a credit on a payable bill', { direction: 'payable' as const, ...credit }],
    ['a debit on a receivable bill', { direction: 'receivable' as const, ...debit }],
    ['a zero amount', { direction: 'payable' as const, ...debit, amountCents: 0 }],
    ['a transfer', { direction: 'payable' as const, ...debit, nature: 'transfer' }],
    [
      'a payment of invoice',
      { direction: 'payable' as const, ...debit, nature: 'invoice_payment' },
    ],
    ['a lent expense', { direction: 'payable' as const, ...debit, nature: 'lent' }],
    ['one that does not count', { direction: 'payable' as const, ...debit, counts: false }],
    ['a split one', { direction: 'payable' as const, ...debit, isSplit: true }],
  ])('refuses %s', (_name, input) => {
    expect(() => {
      assertTransactionCanPayBill(input);
    }).toThrow(BillPaymentTransactionInvalidError);
  });
});
