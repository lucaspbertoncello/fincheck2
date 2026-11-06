import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoriesTable } from '#/database/tables/categories/categories-table.type.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';

// A valid expense category straight in the table (no entity yet). Returns its id.
export async function insertTestCategory(
  db: Kysely<Database>,
  overrides: Partial<Insertable<CategoriesTable>> = {},
): Promise<string> {
  const id = overrides.id ?? generateId();
  await db
    .insertInto('categories')
    .values({
      id,
      kind: 'expense',
      name: `Categoria ${id}`,
      icon: 'food',
      is_default: 0,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    })
    .execute();

  return id;
}
