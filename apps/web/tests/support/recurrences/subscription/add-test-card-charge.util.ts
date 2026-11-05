import { invoiceMonthFor } from '#mocks/invoices/invoice/invoice-month-for.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';

/** The Nubank card of the mock seed ("Roxinho"). */
export function findTestCard(): MockState.AccountRecord & {
  creditCard: NonNullable<MockState.AccountRecord['creditCard']>;
} {
  const card = db.accounts.find((account) => account.name === 'Roxinho');
  if (!card?.creditCard) throw new Error('The seed has no Roxinho card');

  return { ...card, creditCard: card.creditCard };
}

/** A purchase on the card, in the database of the mock; returns the record. */
export function addTestCardCharge(
  description: string,
  occurredOn: string,
  amountCents: number,
  accountId = findTestCard().id,
): MockState.TransactionRecord {
  const card = findTestCard();
  const tx = makeTransactionRecord({
    accountId,
    method: 'credit',
    description,
    amountCents: -amountCents,
    occurredOn,
    invoiceMonth: invoiceMonthFor(card.creditCard.closingDay, occurredOn),
  });
  db.transactions.push(tx);

  return tx;
}
