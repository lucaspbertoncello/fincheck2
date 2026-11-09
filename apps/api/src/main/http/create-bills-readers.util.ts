import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';
import { FindBillLinkedTransactionsQuery } from '#/modules/bills/application/bill-payment/find-bill-linked-transactions.query.ts';
import { GetTransactionBillLinksQuery } from '#/modules/bills/application/bill-payment/get-transaction-bill-links.query.ts';
import { KyselyBillRepository } from '#/modules/bills/infra/bill/bill.repository.ts';

// What the other contexts ask `bills` for: the link of a transaction (the `links.bill`) and which
// transactions are tied to a bill. Built before the rest of the app because `invoices`,
// `recurrences` and `transactions` need them to be built, and `bills` needs those back (through
// ports): building these first, from the database alone, breaks the circle.
export function createBillsReaders(deps: {
  db: Kysely<Database>;
  transactions: BillTransactionReader;
}) {
  return {
    links: new GetTransactionBillLinksQuery(deps.db, deps.transactions),
    linkedTransactions: new FindBillLinkedTransactionsQuery(new KyselyBillRepository(deps.db)),
  };
}
