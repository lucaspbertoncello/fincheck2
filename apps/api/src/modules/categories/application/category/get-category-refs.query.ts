import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { CategoryNotFoundError } from '#/modules/categories/domain/category/category-not-found.error.ts';

// What other contexts need to know of a category to put it somewhere: its kind and whether it is
// archived. `transactions` asks it through its `TransactionCategoryReader`, which this class
// satisfies; the rules of this context use it too. Throws `CATEGORY_NOT_FOUND` when an id is
// unknown; an archived category is returned as such.
export class GetCategoryRefsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async requireCategories(
    categoryIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, { id: string; kind: 'expense' | 'income'; isArchived: boolean }>> {
    const unique = [...new Set(categoryIds)];
    if (unique.length === 0) return new Map();

    const rows = await executor
      .selectFrom('categories')
      .select(['id', 'kind', 'archived_at'])
      .where('id', 'in', unique)
      .execute();
    if (rows.length !== unique.length) throw new CategoryNotFoundError();

    return new Map(
      rows.map((row) => [
        row.id,
        { id: row.id, kind: row.kind, isArchived: row.archived_at !== null },
      ]),
    );
  }
}
