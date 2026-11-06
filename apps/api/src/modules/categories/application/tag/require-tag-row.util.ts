import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TagsTable } from '#/database/tables/categories/tags-table.type.ts';
import { TagNotFoundError } from '#/modules/categories/domain/tag/tag-not-found.error.ts';

// The row of a tag, or `TAG_NOT_FOUND`. A tag is a plain register: the use cases read and write its
// row directly.
export async function requireTagRow(
  executor: Kysely<Database>,
  tagId: string,
): Promise<Selectable<TagsTable>> {
  const row = await executor
    .selectFrom('tags')
    .selectAll()
    .where('id', '=', tagId)
    .executeTakeFirst();
  if (!row) throw new TagNotFoundError();

  return row;
}
