import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The occurrence each transaction settled, for the `links` of the transaction (RF-REC-004).
// `transactions` asks it through its `TransactionLinksReader`, which this class satisfies (the
// `main` puts it together with the readers of `invoices` and, later, `bills`). It only knows its own
// link: `invoicePayment` and `bill` come back null. A transaction with no link is absent from the
// map. The link shows even when the transaction no longer counts (ignored): it is still tied.
export class GetTransactionOccurrenceLinksQuery {
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
      .selectFrom('occurrence_payments as p')
      .innerJoin('recurrence_occurrences as o', 'o.id', 'p.occurrence_id')
      .innerJoin('recurrences as r', 'r.id', 'o.recurrence_id')
      .select(['p.transaction_id', 'o.id as occurrence_id', 'r.name as recurrence_name'])
      .where('p.transaction_id', 'in', transactionIds)
      .execute();

    return new Map(
      rows.map((row) => [
        row.transaction_id,
        {
          occurrence: { occurrenceId: row.occurrence_id, recurrenceName: row.recurrence_name },
          bill: null,
          invoicePayment: null,
        },
      ]),
    );
  }
}
