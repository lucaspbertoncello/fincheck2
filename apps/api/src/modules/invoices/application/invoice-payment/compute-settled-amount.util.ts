import type { PaymentTransactionReader } from '#/modules/invoices/application/invoice-payment/payment-transaction-reader.interface.ts';
import type { InvoicePayment } from '#/modules/invoices/domain/invoice-payment/invoice-payment.entity.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// What the payments of an invoice settle today. A payment by hand is worth its amount. One tied to
// a transaction is worth the smaller of its amount and the current value of the transaction, and
// only while the transaction counts (not ignored, not removed by the bank without an edit): so
// ignoring or fixing the transaction changes the paid amount at once (ERD, `invoices`).
export function computeSettledAmount(
  payments: InvoicePayment[],
  transactions: Map<string, PaymentTransactionReader.Snapshot>,
): Money {
  return payments.reduce((sum, payment) => {
    if (payment.transactionId === null) return sum.add(payment.amount);

    const transaction = transactions.get(payment.transactionId);
    if (!transaction?.counts) return sum;

    const worth = Math.min(payment.amount.cents, Math.abs(transaction.amountCents));

    return sum.add(Money.fromCents(worth));
  }, Money.zero());
}
