import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The transaction settles an occurrence of a recurrence that has a category: if it has none, it
// takes that one, with the origin `recurrence` (the entity decides, see `applyRecurrenceCategory`;
// when it does not apply nothing is written). `recurrences` calls it in the unit of work of the
// link, with the executor of that transaction. Satisfies its `ApplyRecurrenceCategory` port.
export class ApplyRecurrenceCategoryUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(transactions: TransactionRepository<Kysely<Database>>, clock: Clock) {
    this.transactions = transactions;
    this.clock = clock;
  }

  async execute(
    transactionId: string,
    category: { id: string; kind: 'expense' | 'income'; isArchived: boolean },
    executor: Kysely<Database>,
  ): Promise<void> {
    const transaction = await requireTransaction(this.transactions, transactionId, executor);

    if (transaction.applyRecurrenceCategory(category, this.clock.now())) {
      await this.transactions.save(transaction, executor);
    }
  }
}
