import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to what the deletion of an account takes from `categories`: the rules with a condition on
// this account (without the account they would apply to everything).
export interface AccountRulesReader {
  countOf(accountId: string, executor?: Kysely<Database>): Promise<number>;
}
