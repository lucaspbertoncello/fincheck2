import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { CategoryNameTakenError } from '#/modules/categories/domain/category/category-name-taken.error.ts';

// `CATEGORY_NAME_TAKEN`: no other category of the same kind, active or archived, has the name,
// compared with no difference for case or accent. Done here and not by the `NOCASE` index alone,
// which only folds ASCII.
export async function assertCategoryNameFree(
  executor: Kysely<Database>,
  input: { kind: 'expense' | 'income'; name: string; exceptId?: string },
): Promise<void> {
  const sameKind = await executor
    .selectFrom('categories')
    .select(['id', 'name'])
    .where('kind', '=', input.kind)
    .execute();
  const wanted = normalizeText(input.name);

  if (sameKind.some((row) => row.id !== input.exceptId && normalizeText(row.name) === wanted)) {
    throw new CategoryNameTakenError();
  }
}
