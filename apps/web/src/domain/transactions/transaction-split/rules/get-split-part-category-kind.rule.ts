import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import { getAcceptedCategoryKinds } from '#/domain/transactions/transaction/rules/get-accepted-category-kinds.rule.ts';

/**
 * The kind of category the parts of a split transaction take: the kind of the transaction's nature,
 * never the sign. A credit on a card is an `expense` with a positive value, so its parts take
 * categories of expense (the exception of `getAcceptedCategoryKinds` for a credit on a card does
 * not reach the parts). Null when the nature takes no category.
 */
export function getSplitPartCategoryKind(
  nature: Transaction.Dto['nature'],
): Category.Dto['kind'] | null {
  const [kind] = getAcceptedCategoryKinds({
    nature,
    amountCents: 0,
    isCardAccount: false,
    isSplit: false,
  });

  return kind ?? null;
}
