import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

// A credit on a card: a whole expense or income on a card account with a positive value (a
// refund). It takes a category of either kind (`getAcceptedCategoryKinds` in the web).
export function isCardCredit(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): boolean {
  return (
    (tx.nature === 'expense' || tx.nature === 'income') &&
    tx.amountCents > 0 &&
    Boolean(findAccount(database, tx.accountId).creditCard)
  );
}
