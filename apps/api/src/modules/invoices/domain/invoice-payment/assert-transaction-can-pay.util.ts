import { InvoicePaymentTransactionInvalidError } from '#/modules/invoices/domain/invoice-payment/invoice-payment-transaction-invalid.error.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// Whether a transaction may pay an invoice of the card (RF-BIL-002): it counts (not ignored, not
// removed by the bank without an edit); it is not split and has no other role (a transfer, a
// debt, an adjustment); it is an outgoing of an own account that is not this card, or a credit of
// this very card; and the amount paid does not pass its value. Throws
// `INVOICE_PAYMENT_TRANSACTION_INVALID` with the reason.
export function assertTransactionCanPay(input: {
  transaction: {
    accountId: string;
    // With sign.
    amount: Money;
    nature: string;
    isSplit: boolean;
    counts: boolean;
  };
  cardAccountId: string;
  amount: Money;
}): void {
  const { transaction } = input;

  if (!transaction.counts) {
    throw new InvoicePaymentTransactionInvalidError(
      'ela está ignorada ou foi removida pelo banco.',
    );
  }
  if (transaction.isSplit) {
    throw new InvoicePaymentTransactionInvalidError('ela está dividida.');
  }
  if (!['expense', 'income', 'invoice_payment'].includes(transaction.nature)) {
    throw new InvoicePaymentTransactionInvalidError(
      'ela já tem outro papel (transferência, dívida ou ajuste).',
    );
  }

  const isOutgoingOfOtherAccount =
    transaction.amount.isNegative() && transaction.accountId !== input.cardAccountId;
  const isCreditOfTheCard =
    !transaction.amount.isNegative() &&
    !transaction.amount.isZero() &&
    transaction.accountId === input.cardAccountId;
  if (!isOutgoingOfOtherAccount && !isCreditOfTheCard) {
    throw new InvoicePaymentTransactionInvalidError(
      'precisa ser uma saída de uma conta sua ou um crédito deste cartão.',
    );
  }

  if (input.amount.cents > Math.abs(transaction.amount.cents)) {
    throw new InvoicePaymentTransactionInvalidError('o valor passa do valor da transação.');
  }
}
