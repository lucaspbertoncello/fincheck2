import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { buildTransactionLinks } from '#mocks/transactions/transaction/build-transaction-links.util.ts';
import { competenceOn } from '#mocks/transactions/transaction/competence-on.util.ts';
import { isInReview } from '#mocks/transactions/transaction/is-in-review.util.ts';
import { isTransactionEdited } from '#mocks/transactions/transaction/is-transaction-edited.util.ts';
import { suggestCategories } from '#mocks/transactions/transaction/suggest-categories.util.ts';

// Builds the contract's Transaction.Dto from the stored record: the derived fields are computed
// here, so they follow every change.
export function presentTransaction(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): Transaction.Dto {
  const inReview = isInReview(tx);

  return {
    ...tx,
    competenceOn: competenceOn(database, tx),
    isEdited: isTransactionEdited(tx),
    links: buildTransactionLinks(database, tx),
    isInReview: inReview,
    categorySuggestion: inReview ? (suggestCategories(database, tx)[0]?.categoryId ?? null) : null,
  };
}
