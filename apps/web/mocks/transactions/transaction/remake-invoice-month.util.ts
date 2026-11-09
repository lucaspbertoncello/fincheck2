import { invoiceMonthFor } from '#mocks/invoices/invoice/invoice-month-for.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

// A card purchase whose date moved (the bank's version came back) lands on the invoice of its new
// date, except an installment: it stays in the invoice of its plan (N6).
export function remakeInvoiceMonth(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
  dateBefore: string,
): void {
  if (tx.occurredOn === dateBefore || tx.invoiceMonth === null || tx.installment) return;
  const card = database.accounts.find((account) => account.id === tx.accountId)?.creditCard;
  if (card) tx.invoiceMonth = invoiceMonthFor(card.closingDay, tx.occurredOn);
}
