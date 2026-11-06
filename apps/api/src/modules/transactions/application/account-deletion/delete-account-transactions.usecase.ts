import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// Deletes the installment plans and the transactions of an account, inside the unit of work of the
// deletion (BR-ACC-008). The other leg of a transfer is not lost: its nature goes back by the sign,
// so it counts again instead of staying outside forever. The links of payment (invoice, bill,
// occurrence) fall by `ON DELETE CASCADE`, since their state is derived. Satisfies the
// `DeleteAccountTransactions` port of `accounts`.
export class DeleteAccountTransactionsUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.clock = clock;
  }

  async execute(accountId: string, executor: Kysely<Database>): Promise<void> {
    const now = this.clock.now();
    const counterparts = await this.transactions.findTransferCounterpartsOfAccount(
      accountId,
      executor,
    );

    await this.transactions.deleteByAccount(accountId, executor);

    for (const counterpart of counterparts) {
      const account = await this.accounts.requireAccount(counterpart.accountId, executor);
      counterpart.returnNature({ isCardAccount: account.isCard }, now);
      await this.transactions.save(counterpart, executor);
    }
  }
}
