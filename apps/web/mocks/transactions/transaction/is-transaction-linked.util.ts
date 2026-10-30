import type { MockState } from '#mocks/state/mock-state.type.ts';

// A transaction already tied to an invoice, a bill (as payment or origin) or an occurrence.
export function isTransactionLinked(database: MockState.Database, transactionId: string): boolean {
  return (
    database.invoices.some((invoice) =>
      invoice.payments.some((payment) => payment.transactionId === transactionId),
    ) ||
    database.bills.some(
      (bill) =>
        bill.origin?.transactionId === transactionId ||
        bill.payments.some((payment) => payment.transactionId === transactionId),
    ) ||
    database.occurrences.some((occurrence) =>
      occurrence.payments.some((payment) => payment.transactionId === transactionId),
    )
  );
}
