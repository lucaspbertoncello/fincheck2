import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the category rules still alive. The "Desfazer" of a bulk action brings back the id of the
// rule that had categorized a transaction; a rule deleted meanwhile leaves no id. The owner is
// `categories` (not built yet): the bulk routes stay unmounted until it is.
export interface CategoryRuleReader {
  existingRuleIds(ruleIds: string[], executor?: Kysely<Database>): Promise<Set<string>>;
}
