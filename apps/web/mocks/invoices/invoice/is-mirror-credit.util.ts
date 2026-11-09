import type { MockState } from '#mocks/state/mock-state.type.ts';
import { daysBetween } from '#mocks/support/dates/days-between.util.ts';

// The credit on the card that mirrors a debit of an own account: positive, the same value within
// R$ 0,01 and up to 3 days apart.
export function isMirrorCredit(
  debit: MockState.TransactionRecord,
  credit: MockState.TransactionRecord,
): boolean {
  const sameValue = Math.abs(Math.abs(debit.amountCents) - Math.abs(credit.amountCents)) <= 1;

  return (
    credit.amountCents > 0 &&
    sameValue &&
    Math.abs(daysBetween(debit.occurredOn, credit.occurredOn)) <= 3
  );
}
