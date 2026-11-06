import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the category rules still alive. The "Desfazer" of a bulk action brings back the id of the
// rule that had categorized a transaction; a rule deleted meanwhile leaves no id. The owner is
// `categories`, which plugs its query in at `createApp`; the bulk routes exist only with it.
export interface CategoryRuleReader {
  existingRuleIds(ruleIds: string[], executor?: Kysely<Database>): Promise<Set<string>>;
}
