import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TagsTable } from '#/database/tables/categories/tags-table.type.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';

// A valid tag straight in the table. A tag belongs to a category: with no `category_id` it gets a
// new expense category of its own. Returns its id.
export async function insertTestTag(
  db: Kysely<Database>,
  overrides: Partial<Insertable<TagsTable>> = {},
): Promise<string> {
  const id = overrides.id ?? generateId();
  const categoryId = overrides.category_id ?? (await insertTestCategory(db));
  await db
    .insertInto('tags')
    .values({
      id,
      name: `Tag ${id}`,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
      category_id: categoryId,
    })
    .execute();

  return id;
}
