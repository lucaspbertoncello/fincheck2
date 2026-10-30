import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';

import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';

// The closing date of the invoice of `month`: the closing day, held at the end of short months.
export function closesOnFor(card: CreditCard.Dto, month: string): string {
  return dateInMonth(month, card.closingDay);
}
