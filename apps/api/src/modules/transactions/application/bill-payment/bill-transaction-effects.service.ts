import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What a bill does to the transactions it ties to (BR-BIL-005, 006), one call per effect, each in
// the unit of work of the caller (it receives that executor). The entity decides every rule; here
// we only load, call and save. The `release*` ones and `clearCategory` give the effect back and do
// nothing when the transaction no longer has it or no longer exists. `bills` calls it through its
// `BillTransactionWriter`, which this class satisfies.
export class BillTransactionEffects {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(transactions: TransactionRepository<Kysely<Database>>, clock: Clock) {
    this.transactions = transactions;
    this.clock = clock;
  }

  async lend(
    transactionId: string,
    friendCents: number,
    executor: Kysely<Database>,
  ): Promise<void> {
    const transaction = await requireTransaction(this.transactions, transactionId, executor);
    transaction.moveToFriend('lent', friendCents, this.clock.now());
    await this.transactions.save(transaction, executor);
  }

  async releaseLent(transactionId: string, executor: Kysely<Database>): Promise<void> {
    const transaction = await this.transactions.findById(transactionId, executor);
    if (transaction?.returnFromFriend('lent', this.clock.now())) {
      await this.transactions.save(transaction, executor);
    }
  }

  async reimburse(
    transactionId: string,
    reimbursedCents: number,
    executor: Kysely<Database>,
  ): Promise<void> {
    const transaction = await requireTransaction(this.transactions, transactionId, executor);
    transaction.moveToFriend('reimbursed', reimbursedCents, this.clock.now());
    await this.transactions.save(transaction, executor);
  }

  async releaseReimbursed(transactionId: string, executor: Kysely<Database>): Promise<void> {
    const transaction = await this.transactions.findById(transactionId, executor);
    if (transaction?.returnFromFriend('reimbursed', this.clock.now())) {
      await this.transactions.save(transaction, executor);
    }
  }

  async applyCategory(
    transactionId: string,
    category: { id: string; kind: 'expense' | 'income'; isArchived: boolean },
    executor: Kysely<Database>,
  ): Promise<void> {
    const transaction = await requireTransaction(this.transactions, transactionId, executor);
    if (transaction.applyBillCategory(category, this.clock.now())) {
      await this.transactions.save(transaction, executor);
    }
  }

  async clearCategory(transactionId: string, executor: Kysely<Database>): Promise<void> {
    const transaction = await this.transactions.findById(transactionId, executor);
    if (transaction?.clearBillCategory(this.clock.now())) {
      await this.transactions.save(transaction, executor);
    }
  }
}
