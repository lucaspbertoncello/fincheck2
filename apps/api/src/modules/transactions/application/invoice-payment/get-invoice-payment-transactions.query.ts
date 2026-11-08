import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import { TransactionNotFoundError } from '#/modules/transactions/domain/transaction/transaction-not-found.error.ts';

// What `invoices` needs of the transactions that pay (or may pay) an invoice: the amount in use,
// the account, the nature, whether it is split, and whether it counts (not ignored, not removed by
// the bank without an edit). `invoices` asks it through its `PaymentTransactionReader`, which this
// class satisfies. `requireOne` throws `TRANSACTION_NOT_FOUND`.
export class GetInvoicePaymentTransactionsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findMany(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, GetInvoicePaymentTransactionsQuery.Snapshot>> {
    const unique = [...new Set(transactionIds)];
    if (unique.length === 0) return new Map();

    const rows = await executor
      .selectFrom('transactions as t')
      .select([
        't.id',
        't.account_id',
        't.amount_cents',
        't.nature',
        entersAccountsSql('t').as('counts'),
        sql<number>`exists (select 1 from transaction_splits as s where s.transaction_id = t.id)`.as(
          'is_split',
        ),
      ])
      .where('t.id', 'in', unique)
      .execute();

    return new Map(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          accountId: row.account_id,
          amountCents: row.amount_cents,
          nature: row.nature,
          isSplit: Boolean(row.is_split),
          counts: Boolean(row.counts),
        },
      ]),
    );
  }

  async requireOne(
    transactionId: string,
    executor: Kysely<Database> = this.db,
  ): Promise<GetInvoicePaymentTransactionsQuery.Snapshot> {
    const snapshot = (await this.findMany([transactionId], executor)).get(transactionId);
    if (!snapshot) throw new TransactionNotFoundError();

    return snapshot;
  }
}

export namespace GetInvoicePaymentTransactionsQuery {
  export type Snapshot = {
    id: string;
    accountId: string;
    amountCents: number;
    nature: Database['transactions']['nature'];
    isSplit: boolean;
    counts: boolean;
  };
}
