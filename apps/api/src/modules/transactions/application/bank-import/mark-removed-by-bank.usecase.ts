import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The bank stopped sending these (BR-TRX-005): unedited, they leave the accounts; edited, they stay
// with the alert. The Pluggy says the removal is "not necessarily permanent", so the transaction
// is kept, and comes back if the bank sends it again. Answers how many were marked now (one marked
// before is not counted again). Runs inside the unit of work of the round, with its executor.
export class MarkRemovedByBankUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(transactions: TransactionRepository<Kysely<Database>>, clock: Clock) {
    this.transactions = transactions;
    this.clock = clock;
  }

  async execute(
    input: MarkRemovedByBankUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<MarkRemovedByBankUseCase.Output> {
    const now = this.clock.now();
    let removedCount = 0;

    for (const transaction of await this.transactions.findByIds(input.transactionIds, executor)) {
      if (transaction.origin !== 'bank' || transaction.removedByBankAt !== null) continue;
      transaction.markRemovedByBank(now);
      await this.transactions.save(transaction, executor);
      removedCount += 1;
    }

    return { removedCount };
  }
}

export namespace MarkRemovedByBankUseCase {
  export type Input = { transactionIds: string[] };
  export type Output = { removedCount: number };
}
