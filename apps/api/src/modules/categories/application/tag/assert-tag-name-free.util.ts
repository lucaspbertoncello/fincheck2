import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { TagNameTakenError } from '#/modules/categories/domain/tag/tag-name-taken.error.ts';

// `TAG_NAME_TAKEN`: no other tag of the category, active or archived, has the name, compared with no
// difference for case or accent (the `NOCASE` index only folds ASCII). The same name may exist in
// another category.
export async function assertTagNameFree(
  executor: Kysely<Database>,
  input: { categoryId: string; name: string; exceptId?: string },
): Promise<void> {
  const rows = await executor
    .selectFrom('tags')
    .select(['id', 'name'])
    .where('category_id', '=', input.categoryId)
    .execute();
  const wanted = normalizeText(input.name);

  if (rows.some((row) => row.id !== input.exceptId && normalizeText(row.name) === wanted)) {
    throw new TagNameTakenError();
  }
}
