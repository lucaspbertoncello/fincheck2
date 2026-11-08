import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the category a recurrence gives to the transactions it settles. The owner is
// `categories`, which throws its own `CATEGORY_NOT_FOUND` when an id does not exist; an archived
// category is returned as such.
export interface RecurrenceCategoryReader {
  requireCategories(
    categoryIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, { id: string; kind: 'expense' | 'income'; isArchived: boolean }>>;
}
