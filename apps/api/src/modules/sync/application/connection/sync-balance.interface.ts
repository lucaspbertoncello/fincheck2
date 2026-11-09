import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// What `sync` asks of `transactions` when a connection is removed (Q8): the balance of a manual
// account (the sum of its transactions up to today) and the adjustment that makes it open equal to
// the last balance of the bank. The owner is `transactions`, which `main` wires here.
export interface SyncBalance {
  balancesOf(accountIds: string[], executor?: Kysely<Database>): Promise<Map<string, number>>;
  // Records a `balance_adjustment` of today with the sign of the difference (never zero).
  adjust(
    input: { accountId: string; amountCents: number; occurredOn: string; note: string | null },
    executor: Kysely<Database>,
  ): Promise<{ transactionId: string }>;
}
