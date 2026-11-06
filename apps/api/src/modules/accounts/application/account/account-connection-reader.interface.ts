import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the Pluggy connection of an account (status, error, last bank update). The owner is
// `sync`, which is wired here in `main`.
export interface AccountConnectionReader {
  // Only the accounts that have a connection come back in the map.
  connectionsOf(
    accountIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, Account.Connection>>;
}
