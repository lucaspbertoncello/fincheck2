import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What the detectors of the import found (BR-TRX-006): transactions that pay an invoice and pairs
// of legs of a transfer. The nature only changes where the system still owns it (`natureSetBy =
// system`, a plain expense or income, not split): what Lucas chose is never undone. A pair changes
// whole or not at all. Answers the ids that changed, so the round knows the final nature of each
// transaction before the rules. Runs inside the unit of work of the round, with its executor.
export class ApplyDetectedNaturesUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(transactions: TransactionRepository<Kysely<Database>>, clock: Clock) {
    this.transactions = transactions;
    this.clock = clock;
  }

  async execute(
    input: ApplyDetectedNaturesUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<ApplyDetectedNaturesUseCase.Output> {
    const now = this.clock.now();
    const ids = [
      ...input.payments,
      ...input.transfers.flatMap((pair) => [pair.firstId, pair.secondId]),
    ];
    const byId = new Map(
      (await this.transactions.findByIds(ids, executor)).map((transaction) => [
        transaction.id,
        transaction,
      ]),
    );
    const payments: string[] = [];
    const transfers: string[] = [];

    for (const id of input.payments) {
      const transaction = byId.get(id);
      if (!transaction?.applyDetectedNature('invoice_payment', now)) continue;
      await this.transactions.save(transaction, executor);
      payments.push(id);
    }

    for (const pair of input.transfers) {
      const first = byId.get(pair.firstId);
      const second = byId.get(pair.secondId);
      if (!first?.canTakeDetectedNature() || !second?.canTakeDetectedNature()) continue;

      first.applyDetectedNature('transfer', now);
      second.applyDetectedNature('transfer', now);
      Transaction.linkDetectedTransfer(first, second, now);
      await this.transactions.save(first, executor);
      await this.transactions.save(second, executor);
      transfers.push(first.id, second.id);
    }

    return { payments, transfers };
  }
}

export namespace ApplyDetectedNaturesUseCase {
  export type Input = {
    // Ids of the transactions that pay an invoice.
    payments: string[];
    transfers: { firstId: string; secondId: string }[];
  };

  export type Output = { payments: string[]; transfers: string[] };
}
