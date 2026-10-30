import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { competenceOn } from '#mocks/transactions/transaction/competence-on.util.ts';
import { isInReview } from '#mocks/transactions/transaction/is-in-review.util.ts';
import { isTransactionEdited } from '#mocks/transactions/transaction/is-transaction-edited.util.ts';
import { suggestCategories } from '#mocks/transactions/transaction/suggest-categories.util.ts';

function buildLinks(
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

// Builds the contract's Transaction.Dto from the stored record: the derived fields are computed
// here, so they follow every change.
export function presentTransaction(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): Transaction.Dto {
  const inReview = isInReview(tx);

  return {
    ...tx,
    competenceOn: competenceOn(database, tx),
    isEdited: isTransactionEdited(tx),
    links: buildLinks(database, tx),
    isInReview: inReview,
    categorySuggestion: inReview ? (suggestCategories(database, tx)[0]?.categoryId ?? null) : null,
  };
}
