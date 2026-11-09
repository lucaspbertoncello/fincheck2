import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { isCardCredit } from '#mocks/transactions/transaction/is-card-credit.util.ts';

// What a category does to a credit on a card (`Transaction.assignCategory`): one of income turns it
// into income (chosen by Lucas); none, or one of expense, brings it back to an expense, decided by
// the system again. Any other transaction keeps its nature, which already is the kind of its
// category. Call it with the category the transaction ends up with, after the category is written.
export function applyCardCreditNature(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): void {
  if (!isCardCredit(database, tx)) return;
  const category = tx.categoryId ? findCategory(database, tx.categoryId) : null;
  const becomesIncome = category?.kind === 'income' && !category.isTransfer;
  if (becomesIncome && tx.nature === 'expense') {
    tx.nature = 'income';
    tx.natureSetBy = 'user';
  } else if (!becomesIncome && tx.nature === 'income') {
    tx.nature = 'expense';
    tx.natureSetBy = 'system';
  }
}
