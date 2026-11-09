import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the category of a bill. The owner is `categories`, which throws its own
// `CATEGORY_NOT_FOUND` when an id does not exist; an archived category is returned as such.
export interface BillCategoryReader {
  requireCategories(
    categoryIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, { id: string; kind: 'expense' | 'income'; isArchived: boolean }>>;
}
