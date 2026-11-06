import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TagsTable } from '#/database/tables/categories/tags-table.type.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';

// A valid tag straight in the table. Returns its id.
export async function insertTestTag(
  db: Kysely<Database>,
  overrides: Partial<Insertable<TagsTable>> = {},
): Promise<string> {
  const id = overrides.id ?? generateId();
  await db
    .insertInto('tags')
    .values({
      id,
      name: `Tag ${id}`,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    })
    .execute();

  return id;
}
