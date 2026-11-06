import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { TagNotFoundError } from '#/modules/categories/domain/tag/tag-not-found.error.ts';

// What other contexts need to know of a tag: whether it is archived. `transactions` asks it
// through its `TransactionTagReader`, which this class satisfies; the rules of this context use it
// too. Throws `TAG_NOT_FOUND` when an id is unknown; an archived tag is returned as such. The answer
// keeps the order of the ids.
export class GetTagRefsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async requireTags(
    tagIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<{ id: string; isArchived: boolean }[]> {
    if (tagIds.length === 0) return [];
    const rows = await executor
      .selectFrom('tags')
      .select(['id', 'archived_at'])
      .where('id', 'in', [...new Set(tagIds)])
      .execute();
    const byId = new Map(rows.map((row) => [row.id, row]));

    return tagIds.map((id) => {
      const row = byId.get(id);
      if (!row) throw new TagNotFoundError();

      return { id, isArchived: row.archived_at !== null };
    });
  }
}
