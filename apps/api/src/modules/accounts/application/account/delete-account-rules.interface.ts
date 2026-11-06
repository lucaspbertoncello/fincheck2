import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the use case of `categories` that deletes the rules with a condition on the account. Runs
// inside the unit of work of the deletion.
export interface DeleteAccountRules {
  execute(accountId: string, executor: Kysely<Database>): Promise<void>;
}
