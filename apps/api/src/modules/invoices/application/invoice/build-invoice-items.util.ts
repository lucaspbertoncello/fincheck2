import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';
import type { RecurrenceExpectationReader } from '#/modules/invoices/application/invoice/recurrence-expectation-reader.interface.ts';

// The lines of the page of the invoice: the transactions of the cycle and, while it has not
// closed, the recurrences still expected. Newest first by the date of the line (the expected date
// for a recurrence; one with no date goes last), the biggest id first on a tie.
export function buildInvoiceItems(
  transactions: CardInvoiceTransactionReader.Item[],
  expectations: RecurrenceExpectationReader.Expectation[],
): Invoice.Item[] {
  const lines: { sortDate: string | null; sortId: string; item: Invoice.Item }[] = [
    ...transactions.map((transaction) => ({
      sortDate: transaction.occurredOn,
      sortId: transaction.transactionId,
      item: {
        type: 'transaction' as const,
        transactionId: transaction.transactionId,
        description: transaction.description,
        occurredOn: transaction.occurredOn,
        amountCents: transaction.amountCents,
        // A split transaction has its categories on its parts.
        categoryId: transaction.parts.length > 0 ? null : transaction.categoryId,
        installment: transaction.installment,
      },
    })),
    ...expectations.map((expectation) => ({
      sortDate: expectation.expectedOn,
      sortId: expectation.occurrenceId,
      item: {
        type: 'expected_recurrence' as const,
        occurrenceId: expectation.occurrenceId,
        recurrenceName: expectation.recurrenceName,
        expectedOn: expectation.expectedOn,
        amountCents: expectation.amountCents,
      },
    })),
  ];

  return lines
    .toSorted((a, b) => {
      if (a.sortDate === null || b.sortDate === null) {
        if (a.sortDate === b.sortDate) return b.sortId.localeCompare(a.sortId);

        return a.sortDate === null ? 1 : -1;
      }

      return b.sortDate.localeCompare(a.sortDate) || b.sortId.localeCompare(a.sortId);
    })
    .map((line) => line.item);
}
