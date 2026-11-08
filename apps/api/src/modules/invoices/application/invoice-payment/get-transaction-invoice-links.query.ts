import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The invoice each transaction pays, for the `links` of the transaction. `transactions` asks it
// through its `TransactionLinksReader`, which this class satisfies. It only knows its own link:
// `occurrence` and `bill` come back null (the readers of `recurrences` and `bills`, when they exist,
// are put together with this one in the `main`). A transaction with no link is absent from the map.
export class GetTransactionInvoiceLinksQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async linksOf(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, Transaction.LinksDto>> {
    if (transactionIds.length === 0) return new Map();

    const rows = await executor
      .selectFrom('invoice_payments as p')
      .innerJoin('invoices as i', 'i.id', 'p.invoice_id')
      .select(['p.transaction_id', 'i.account_id', 'i.month'])
      .where('p.transaction_id', 'in', transactionIds)
      .execute();

    return new Map(
      rows.flatMap((row) =>
        row.transaction_id === null
          ? []
          : [
              [
                row.transaction_id,
                {
                  occurrence: null,
                  bill: null,
                  invoicePayment: { accountId: row.account_id, month: row.month },
                },
              ] as const,
            ],
      ),
    );
  }
}
