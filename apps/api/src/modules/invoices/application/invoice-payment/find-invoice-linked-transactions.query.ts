import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';

// Which transactions already pay an invoice. `bills` asks it through its `LinkedElsewhereReader`,
// which this class satisfies: a transaction that pays an invoice cannot also pay a bill, and is not
// offered as a candidate of one.
export class FindInvoiceLinkedTransactionsQuery {
  private readonly invoices: InvoiceRepository<Kysely<Database>>;

  constructor(invoices: InvoiceRepository<Kysely<Database>>) {
    this.invoices = invoices;
  }

  findLinkedTransactionIds(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Set<string>> {
    return this.invoices.findLinkedTransactionIds(transactionIds, executor);
  }
}
