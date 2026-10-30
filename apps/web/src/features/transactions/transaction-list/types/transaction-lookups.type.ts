import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';

/** The small lists (accounts, categories, tags) by id, to put names and icons on a transaction. */
export type TransactionLookups = {
  accounts: ReadonlyMap<string, Account.Dto>;
  categories: ReadonlyMap<string, Category.Dto>;
  tags: ReadonlyMap<string, Tag.Dto>;
};
