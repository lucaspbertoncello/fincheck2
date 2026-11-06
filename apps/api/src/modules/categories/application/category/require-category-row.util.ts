import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoriesTable } from '#/database/tables/categories/categories-table.type.ts';
import { CategoryNotFoundError } from '#/modules/categories/domain/category/category-not-found.error.ts';

// The row of a category, or `CATEGORY_NOT_FOUND`. A category is a plain register with no rule of
// its own beyond the name, so the use cases read and write its row directly.
export async function requireCategoryRow(
  executor: Kysely<Database>,
  categoryId: string,
): Promise<Selectable<CategoriesTable>> {
  const row = await executor
    .selectFrom('categories')
    .selectAll()
    .where('id', '=', categoryId)
    .executeTakeFirst();
  if (!row) throw new CategoryNotFoundError();

  return row;
}
