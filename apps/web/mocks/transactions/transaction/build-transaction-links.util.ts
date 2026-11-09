import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';

// What a transaction is tied to: an occurrence, a bill (origin or payment) and an invoice payment.
export function buildTransactionLinks(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): Transaction.LinksDto {
  let occurrence: Transaction.LinksDto['occurrence'] = null;
  for (const item of database.occurrences) {
    if (!item.payments.some((payment) => payment.transactionId === tx.id)) continue;
    const recurrence = database.recurrences.find((rec) => rec.id === item.recurrenceId);
    occurrence = { occurrenceId: item.id, recurrenceName: recurrence?.name ?? '' };
  }

  let bill: Transaction.LinksDto['bill'] = null;
  for (const item of database.bills) {
    if (item.origin?.transactionId === tx.id) {
      bill = {
        billId: item.id,
        description: item.description,
        counterparty: item.counterparty,
        role: 'origin',
        amountCents: item.origin.amountCents,
      };
    }
    const payment = item.payments.find((entry) => entry.transactionId === tx.id);
    if (payment) {
      bill = {
        billId: item.id,
        description: item.description,
        counterparty: item.counterparty,
        role: 'payment',
        amountCents: payment.amountCents,
      };
    }
  }

  let invoicePayment: Transaction.LinksDto['invoicePayment'] = null;
  for (const invoice of database.invoices) {
    if (invoice.payments.some((payment) => payment.transactionId === tx.id)) {
      invoicePayment = { accountId: invoice.accountId, month: invoice.month };
    }
  }

  return { occurrence, bill, invoicePayment };
}
