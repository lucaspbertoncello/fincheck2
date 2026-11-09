import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the Pluggy connections of `sync`: the day (São Paulo) the Fincheck first saw each
// account (the birth of its connection, which is its first round; it does not move on a
// reconnection and the sync trimming the rounds does not lose it). An account no connection links to (a manual card) is
// absent. The owner is `sync`.
export interface FirstSyncReader {
  firstSyncDatesOf(accountIds: string[], executor?: Kysely<Database>): Promise<Map<string, string>>;
}
