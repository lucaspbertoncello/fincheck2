import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionCategoryReader } from '#/modules/transactions/application/transaction/transaction-category-reader.interface.ts';
import { NotFoundError } from '#/shared/errors/not-found.error.ts';

class FakeCategoryNotFoundError extends NotFoundError {
  readonly code = 'CATEGORY_NOT_FOUND';

  constructor() {
    super('A categoria não existe.');
  }
}

// Stands for the `categories` context in the tests of `transactions`: reads the table the way the
// owner would, and throws its `CATEGORY_NOT_FOUND`.
export function createTestCategoryReader(db: Kysely<Database>): TransactionCategoryReader {
  return {
    async requireCategories(categoryIds, executor = db) {
      const rows = await executor
        .selectFrom('categories')
        .select(['id', 'kind', 'archived_at', 'is_transfer'])
        .where('id', 'in', categoryIds)
        .execute();
      if (rows.length !== categoryIds.length) throw new FakeCategoryNotFoundError();

      return new Map(
        rows.map((row) => [
          row.id,
          {
            id: row.id,
            kind: row.kind,
            isArchived: row.archived_at !== null,
            isTransfer: row.is_transfer === 1,
          },
        ]),
      );
    },
  };
}
