import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';

import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';

function byId<Item extends { id: string }>(items: readonly Item[]): Map<string, Item> {
  return new Map(items.map((item) => [item.id, item]));
}

export function buildTransactionLookups(
  accounts: readonly Account.Dto[],
  categories: readonly Category.Dto[],
  tags: readonly Tag.Dto[],
): TransactionLookups {
  return { accounts: byId(accounts), categories: byId(categories), tags: byId(tags) };
}
