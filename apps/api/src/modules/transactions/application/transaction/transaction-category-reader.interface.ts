import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';

// Port to the categories a transaction takes. The owner is `categories` (not built yet: the `main`
// leaves it unwired and the use cases refuse a category until it is). It throws its own
// `CATEGORY_NOT_FOUND` when an id does not exist; an archived one is returned as such.
export interface TransactionCategoryReader {
  requireCategories(
    categoryIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, Transaction.CategoryRef>>;
}
