import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';

// The contract's Category.Dto: the counts and the last use are calculated on every read.
export function presentCategory(
  database: MockState.Database,
  record: MockState.CategoryRecord,
): Category.Dto {
  const used = database.transactions.filter(
    (tx) => tx.categoryId === record.id || tx.splits.some((part) => part.categoryId === record.id),
  );
  const lastUsedOn = used.reduce<string | null>(
    (latest, tx) => (latest === null || tx.occurredOn > latest ? tx.occurredOn : latest),
    null,
  );

  return {
    ...record,
    transactionCount: used.length,
    ruleCount: database.rules.filter((rule) => rule.categoryId === record.id).length,
    lastUsedOn,
  };
}
