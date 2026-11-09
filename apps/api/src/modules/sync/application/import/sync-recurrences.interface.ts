import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// What `sync` asks of `recurrences`: to tie the new transactions to the occurrences they settle
// (`linkedBy = auto`), after making the occurrences that are missing ready. The owner is
// `recurrences`, which `main` wires here.
export interface SyncRecurrences {
  autoMatch(
    input: { transactionIds: string[] },
    executor: Kysely<Database>,
  ): Promise<{ linkedCount: number }>;
}
