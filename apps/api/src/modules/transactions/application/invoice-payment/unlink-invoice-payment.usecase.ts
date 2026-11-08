import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The payment of the invoice was undone, so the transaction gets its place back: one that Lucas had
// turned into a payment returns to expense or income by its sign (positive on a card is an expense),
// and one the import detector marked stays a payment, a suggestion again. `invoices` calls it in
// the unit of work of the undo, and when the card is deleted. Satisfies its
// `UnlinkInvoicePaymentTransaction` port.
export class UnlinkInvoicePaymentUseCase {
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

  async execute(transactionId: string, executor: Kysely<Database>): Promise<void> {
    const transaction = await requireTransaction(this.transactions, transactionId, executor);
    if (transaction.nature !== 'invoice_payment' || transaction.natureSetBy !== 'user') return;

    const account = await this.accounts.requireAccount(transaction.accountId, executor);
    transaction.releaseFromInvoicePayment({ isCardAccount: account.isCard }, this.clock.now());
    await this.transactions.save(transaction, executor);
  }
}
