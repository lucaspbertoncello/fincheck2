import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { unlinkTransfer } from '#mocks/transactions/transaction/unlink-transfer.util.ts';

// A transfer made by the category that is a transfer lost it: the nature goes back by the sign
// (negative is an expense, positive an income, and positive on a card is a refund, an expense),
// decided again by whoever had decided it before (the system when it is not known), the category goes away and the link with the other leg is cut on
// both sides (`Transaction.returnNature`).
export function giveNatureBack(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
  natureSetBy: 'system' | 'user' = 'system',
): void {
  const isCard = Boolean(findAccount(database, tx.accountId).creditCard);
  unlinkTransfer(database, tx);
  tx.nature = tx.amountCents >= 0 && !isCard ? 'income' : 'expense';
  tx.natureSetBy = natureSetBy;
  tx.categoryId = null;
  tx.categorySource = null;
  tx.categoryRuleId = null;
}
