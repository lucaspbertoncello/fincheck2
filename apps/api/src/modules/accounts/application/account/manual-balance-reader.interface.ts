import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the balance of a manual account or wallet: the sum of its transactions that are not
// ignored, dated up to today. The owner is `transactions`, which is wired here in `main`.
export interface ManualBalanceReader {
  // Cents by account id; an account with no transaction is 0. Pass the executor of the unit of
  // work when called inside one.
  balancesOf(accountIds: string[], executor?: Kysely<Database>): Promise<Map<string, number>>;
}
