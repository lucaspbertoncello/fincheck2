import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the use case of `transactions` that puts the category of a recurrence on the transaction
// it settles, when the transaction has none (`categorySource = recurrence`). `transactions` decides
// whether it applies (an income or an expense, not split, no category yet, the kind fits, the
// category is not archived); the rest it leaves alone. Runs inside the unit of work of the link.
export interface ApplyRecurrenceCategory {
  execute(
    transactionId: string,
    category: { id: string; kind: 'expense' | 'income'; isArchived: boolean },
    executor: Kysely<Database>,
  ): Promise<void>;
}
