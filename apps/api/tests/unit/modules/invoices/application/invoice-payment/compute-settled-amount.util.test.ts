import { describe, expect, it } from 'vitest';

import type { PaymentTransactionReader } from '#/modules/invoices/application/invoice-payment/payment-transaction-reader.interface.ts';
import { computeSettledAmount } from '#/modules/invoices/application/invoice-payment/compute-settled-amount.util.ts';
import { InvoicePayment } from '#/modules/invoices/domain/invoice-payment/invoice-payment.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

function payment(amount: number, transactionId: string | null = null): InvoicePayment {
  return new InvoicePayment({
    amount: Money.fromCents(amount),
    paidOn: BusinessDate.of('2026-11-05'),
    transactionId,
    createdAt: '2026-11-06T12:00:00.000Z',
  });
}

function snapshot(
  id: string,
  amountCents: number,
  counts = true,
): [string, PaymentTransactionReader.Snapshot] {
  return [
    id,
    { id, accountId: 'checking-1', amountCents, nature: 'invoice_payment', isSplit: false, counts },
  ];
}

describe('computeSettledAmount', () => {
  it('is zero with no payments', () => {
    expect(computeSettledAmount([], new Map()).cents).toBe(0);
  });

  it('counts a payment by hand for its amount, with no transaction needed', () => {
    expect(computeSettledAmount([payment(4000)], new Map()).cents).toBe(4000);
  });

  it('counts a linked payment for its amount when the transaction is bigger', () => {
    const transactions = new Map([snapshot('tx-1', -10000)]);

    expect(computeSettledAmount([payment(4000, 'tx-1')], transactions).cents).toBe(4000);
  });

  it('counts a linked payment for the current value of the transaction when it is smaller', () => {
    const transactions = new Map([snapshot('tx-1', -3000)]);

    expect(computeSettledAmount([payment(4000, 'tx-1')], transactions).cents).toBe(3000);
  });

  it('uses the absolute value of a credit of the card', () => {
    const transactions = new Map([snapshot('tx-1', 3000)]);

    expect(computeSettledAmount([payment(4000, 'tx-1')], transactions).cents).toBe(3000);
  });

  it('counts a linked payment as zero when the transaction does not count', () => {
    const transactions = new Map([snapshot('tx-1', -10000, false)]);

    expect(computeSettledAmount([payment(4000, 'tx-1')], transactions).cents).toBe(0);
  });

  it('counts a linked payment as zero when the transaction is missing from the map', () => {
    expect(computeSettledAmount([payment(4000, 'tx-gone')], new Map()).cents).toBe(0);
  });

  it('sums the payments of every kind', () => {
    const transactions = new Map([
      snapshot('tx-1', -10000),
      snapshot('tx-2', -1500),
      snapshot('tx-3', -9000, false),
    ]);

    const result = computeSettledAmount(
      [
        payment(2000),
        payment(3000, 'tx-1'),
        payment(5000, 'tx-2'),
        payment(7000, 'tx-3'),
        payment(8000, 'tx-gone'),
      ],
      transactions,
    );

    expect(result.cents).toBe(2000 + 3000 + 1500);
  });
});
