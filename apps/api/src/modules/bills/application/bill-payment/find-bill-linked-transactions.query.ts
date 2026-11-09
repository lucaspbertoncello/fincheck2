import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';

// Which transactions already pay or originate a bill. `invoices` and `recurrences` ask it through
// their own ports (`LinkedTransactionReader`), which this class satisfies: a transaction tied to a
// bill is not the payment found of an invoice, is not offered to an occurrence, and cannot be
// linked to either.
export class FindBillLinkedTransactionsQuery {
  private readonly bills: BillRepository<Kysely<Database>>;

  constructor(bills: BillRepository<Kysely<Database>>) {
    this.bills = bills;
  }

  findLinkedTransactionIds(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Set<string>> {
    return this.bills.findLinkedTransactionIds(transactionIds, executor);
  }
}
