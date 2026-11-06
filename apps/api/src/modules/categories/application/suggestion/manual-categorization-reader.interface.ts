import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to what Lucas categorized by hand: the facts the suggestions are made of. The owner is
// `transactions`; the `main` plugs its query in. Only transactions that are not ignored, whose
// `categorySource` is `user`.
export interface ManualCategorizationReader {
  execute(
    executor?: Kysely<Database>,
  ): Promise<{ transactionId: string; description: string; categoryId: string }[]>;
}
