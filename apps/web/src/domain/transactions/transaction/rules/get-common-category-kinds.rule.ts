import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import { getAcceptedCategoryKinds } from '#/domain/transactions/transaction/rules/get-accepted-category-kinds.rule.ts';

type Transactions = Parameters<typeof getAcceptedCategoryKinds>[0][];

/**
 * The kinds of category that fit every transaction of a selection that can take one, so a bulk
 * categorization never offers a category some of them would refuse. A transaction that takes none
 * (a split one, a transfer, an invoice payment) is skipped by the API whatever the category, so it
 * does not narrow the choice. Empty when nothing is left: the selection mixes expenses and incomes,
 * or has no transaction that takes a category.
 */
export function getCommonCategoryKinds(transactions: Transactions): Category.Dto['kind'][] {
  const accepted = transactions.map(getAcceptedCategoryKinds).filter((kinds) => kinds.length > 0);
  if (accepted.length === 0) return [];

  return (['expense', 'income'] as const).filter((kind) =>
    accepted.every((kinds) => kinds.includes(kind)),
  );
}
