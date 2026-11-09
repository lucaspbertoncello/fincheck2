import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';

// The bill each transaction pays or originates, for the `links` of the transaction. `transactions`
// asks it through its `TransactionLinksReader`, which this class satisfies (the `main` puts it
// together with the readers of `invoices` and `recurrences`). It only knows its own link:
// `occurrence` and `invoicePayment` come back null. A transaction with no link is absent from the
// map. For an origin, `amountCents` is the part of the friend.
export class GetTransactionBillLinksQuery {
  private readonly db: Kysely<Database>;
  private readonly transactions: BillTransactionReader;

  constructor(db: Kysely<Database>, transactions: BillTransactionReader) {
    this.db = db;
    this.transactions = transactions;
  }

  async linksOf(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, Transaction.LinksDto>> {
    if (transactionIds.length === 0) return new Map();

    const [payments, origins] = await Promise.all([
      executor
        .selectFrom('bill_payments as p')
        .innerJoin('bills as b', 'b.id', 'p.bill_id')
        .select([
          'p.transaction_id',
          'p.amount_cents',
          'b.id as bill_id',
          'b.description',
          'b.counterparty',
        ])
        .where('p.transaction_id', 'in', transactionIds)
        .execute(),
      executor
        .selectFrom('bills')
        .select(['origin_transaction_id', 'id as bill_id', 'description', 'counterparty'])
        .where('origin_transaction_id', 'in', transactionIds)
        .execute(),
    ]);
    const snapshots = await this.transactions.findMany(
      origins.flatMap((row) => (row.origin_transaction_id ? [row.origin_transaction_id] : [])),
      executor,
    );

    const links = new Map<string, Transaction.LinksDto>();
    const none = { occurrence: null, invoicePayment: null };
    for (const row of payments) {
      if (row.transaction_id === null) continue;
      links.set(row.transaction_id, {
        ...none,
        bill: {
          billId: row.bill_id,
          description: row.description,
          counterparty: row.counterparty,
          role: 'payment',
          amountCents: row.amount_cents,
        },
      });
    }
    for (const row of origins) {
      if (row.origin_transaction_id === null) continue;
      const friendCents = snapshots.get(row.origin_transaction_id)?.lentCents ?? 0;
      if (friendCents <= 0) continue;
      links.set(row.origin_transaction_id, {
        ...none,
        bill: {
          billId: row.bill_id,
          description: row.description,
          counterparty: row.counterparty,
          role: 'origin',
          amountCents: friendCents,
        },
      });
    }

    return links;
  }
}
