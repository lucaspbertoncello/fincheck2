import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The transaction becomes the payment of an invoice: nature `invoice_payment`, chosen by Lucas, no
// category (the entity decides; see `markAsInvoicePayment`). `invoices` calls it in the unit of work
// of the payment, with the executor of that transaction. Satisfies its `LinkInvoicePaymentTransaction`
// port.
export class LinkInvoicePaymentUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(transactions: TransactionRepository<Kysely<Database>>, clock: Clock) {
    this.transactions = transactions;
    this.clock = clock;
  }

  async execute(transactionId: string, executor: Kysely<Database>): Promise<void> {
    const transaction = await requireTransaction(this.transactions, transactionId, executor);

    transaction.markAsInvoicePayment(this.clock.now());
    await this.transactions.save(transaction, executor);
  }
}
