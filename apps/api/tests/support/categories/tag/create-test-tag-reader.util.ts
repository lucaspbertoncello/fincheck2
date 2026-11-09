import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionTagReader } from '#/modules/transactions/application/transaction/transaction-tag-reader.interface.ts';
import { NotFoundError } from '#/shared/errors/not-found.error.ts';

class FakeTagNotFoundError extends NotFoundError {
  readonly code = 'TAG_NOT_FOUND';

  constructor() {
    super('A tag não existe.');
  }
}

// Stands for the `categories` context in the tests of `transactions`: reads the table the way the
// owner would, in the order of the ids, and throws its `TAG_NOT_FOUND`.
export function createTestTagReader(db: Kysely<Database>): TransactionTagReader {
  return {
    async requireTags(tagIds, executor = db) {
      const rows = await executor
        .selectFrom('tags')
        .select(['id', 'category_id', 'archived_at'])
        .where('id', 'in', tagIds)
        .execute();
      const byId = new Map(rows.map((row) => [row.id, row]));

      return tagIds.map((id) => {
        const row = byId.get(id);
        if (!row) throw new FakeTagNotFoundError();

        return { id, categoryId: row.category_id, isArchived: row.archived_at !== null };
      });
    },
  };
}
