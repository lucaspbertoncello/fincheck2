import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { monthOf } from '#mocks/support/dates/month-of.util.ts';

// The month of the invoice a card purchase lands on: up to the closing day it is this month's
// invoice, after it, next month's.
export function invoiceMonthFor(closingDay: number, date: string): string {
  return dayOf(date) <= closingDay ? monthOf(date) : addMonths(monthOf(date), 1);
}
