import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Deletes a transaction entered by hand (RF-TRX-001); the imported one is ignored, and a parcel
// goes with its plan. Parts, tags and the links of payment fall by `ON DELETE CASCADE`. If it was
// a leg of a transfer, the other leg goes back to expense or income by its sign, so it does not
// stay outside the accounts forever.
export class DeleteTransactionUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: DeleteTransactionUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const transaction = await requireTransaction(this.transactions, input.id, executor);
      transaction.assertDeletable();

      const counterpartId = transaction.transferCounterpartId;
      await this.transactions.delete(transaction.id, executor);

      const counterpart = counterpartId
        ? await this.transactions.findById(counterpartId, executor)
        : null;
      if (counterpart) {
        const account = await this.accounts.requireAccount(counterpart.accountId, executor);
        counterpart.returnNature({ isCardAccount: account.isCard }, this.clock.now());
        await this.transactions.save(counterpart, executor);
      }
    });
  }
}

export namespace DeleteTransactionUseCase {
  export type Input = { id: string };
}
