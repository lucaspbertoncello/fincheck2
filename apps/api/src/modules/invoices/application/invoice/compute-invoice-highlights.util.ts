import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';

// The highlights of the page of the invoice (BR-INV-006): the biggest purchase (a purchase is a
// negative amount; a tie goes to the most recent, then to the biggest id), and the installments
// whose last part is on this invoice (`number` equals the count of the plan), biggest first.
export function computeInvoiceHighlights(
  items: CardInvoiceTransactionReader.Item[],
): Invoice.Highlights {
  const purchases = items.filter((item) => item.amountCents < 0);

  const largest = purchases.toSorted(
    (a, b) =>
      a.amountCents - b.amountCents ||
      b.occurredOn.localeCompare(a.occurredOn) ||
      b.transactionId.localeCompare(a.transactionId),
  )[0];

  const endingInstallments = purchases
    .filter(
      (item) => item.installment !== null && item.installment.number === item.installment.count,
    )
    .toSorted(
      (a, b) => a.amountCents - b.amountCents || b.transactionId.localeCompare(a.transactionId),
    )
    .flatMap((item) =>
      item.installment
        ? [
            {
              transactionId: item.transactionId,
              title: item.description,
              cents: -item.amountCents,
              number: item.installment.number,
              total: item.installment.count,
            },
          ]
        : [],
    );

  return {
    largestItem: largest
      ? {
          transactionId: largest.transactionId,
          title: largest.description,
          cents: -largest.amountCents,
        }
      : null,
    endingInstallments,
  };
}
