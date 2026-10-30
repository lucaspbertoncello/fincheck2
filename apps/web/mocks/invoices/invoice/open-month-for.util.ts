import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';

import { invoiceMonthFor } from '#mocks/invoices/invoice/invoice-month-for.util.ts';

// The month of the open invoice: the earliest one that has not closed yet.
export function openMonthFor(card: CreditCard.Dto, today: string): string {
  return invoiceMonthFor(card.closingDay, today);
}
