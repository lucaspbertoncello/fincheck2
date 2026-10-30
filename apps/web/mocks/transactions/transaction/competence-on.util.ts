import type { MockState } from '#mocks/state/mock-state.type.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';

// The date a transaction counts on: its own date, except an installment, which counts on the day of
// the purchase in the month of its invoice (even when the bank dated it otherwise).
export function competenceOn(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): string {
  if (!tx.installment || !tx.invoiceMonth) return tx.occurredOn;
  const plan = database.installmentPlans.find((item) => item.id === tx.installment?.planId);
  if (!plan) return tx.occurredOn;

  return dateInMonth(tx.invoiceMonth, dayOf(plan.purchaseOn));
}
