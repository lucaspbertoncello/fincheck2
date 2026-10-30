import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';

import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { nextBusinessDay } from '#mocks/support/dates/next-business-day.util.ts';

// The due date of the invoice of `month`: the due day of this month when it comes after the
// closing day, otherwise of the next one; a weekend moves to the next business day.
export function dueOnFor(card: CreditCard.Dto, month: string): string {
  const dueMonth = card.dueDay > card.closingDay ? month : addMonths(month, 1);

  return nextBusinessDay(dateInMonth(dueMonth, card.dueDay));
}
