import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the account a rule has as a condition. The owner is `accounts`; it throws its own
// `ACCOUNT_NOT_FOUND` when the id does not exist (an archived account is accepted).
export interface RuleAccountReader {
  requireAccount(accountId: string, executor?: Kysely<Database>): Promise<unknown>;
}
