import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the account a recurrence says it falls in. The owner is `accounts`, which throws its own
// `ACCOUNT_NOT_FOUND` when the id does not exist.
export interface RecurrenceAccountReader {
  requireAccount(
    accountId: string,
    executor?: Kysely<Database>,
  ): Promise<{ id: string; isCard: boolean; isArchived: boolean }>;
}
