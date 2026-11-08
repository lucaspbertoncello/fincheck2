import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import { TransactionNotFoundError } from '#/modules/transactions/domain/transaction/transaction-not-found.error.ts';

// What `recurrences` needs of the transactions that settle (or may settle) an occurrence: the
// amount in use, the account, the nature, whether it is split, whether it counts (not ignored, not
// removed by the bank without an edit), the day, the description and who sent it. `recurrences`
// asks it through its `OccurrenceTransactionReader`, which this class satisfies. `requireOne`
// throws `TRANSACTION_NOT_FOUND`. `findCandidates` is the list Lucas picks the payment from: a
// credit of nature income, or a debit of nature expense, that counts, between two days.
export class GetOccurrenceTransactionsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findMany(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, GetOccurrenceTransactionsQuery.Snapshot>> {
    const unique = [...new Set(transactionIds)];
    if (unique.length === 0) return new Map();

    const rows = await this.select(executor).where('t.id', 'in', unique).execute();

    return new Map(rows.map((row) => [row.id, GetOccurrenceTransactionsQuery.toSnapshot(row)]));
  }

  async requireOne(
    transactionId: string,
    executor: Kysely<Database> = this.db,
  ): Promise<GetOccurrenceTransactionsQuery.Snapshot> {
    const snapshot = (await this.findMany([transactionId], executor)).get(transactionId);
    if (!snapshot) throw new TransactionNotFoundError();

    return snapshot;
  }

  async findCandidates(
    criteria: { kind: 'income' | 'expense'; from: string; to: string },
    executor: Kysely<Database> = this.db,
  ): Promise<GetOccurrenceTransactionsQuery.Snapshot[]> {
    const rows = await this.select(executor)
      .where('t.nature', '=', criteria.kind)
      .where('t.amount_cents', criteria.kind === 'income' ? '>' : '<', 0)
      .where('t.occurred_on', '>=', criteria.from)
      .where('t.occurred_on', '<=', criteria.to)
      .where(entersAccountsSql('t'))
      .execute();

    return rows.map((row) => GetOccurrenceTransactionsQuery.toSnapshot(row));
  }

  private select(executor: Kysely<Database>) {
    return executor
      .selectFrom('transactions as t')
      .select([
        't.id',
        't.account_id',
        't.amount_cents',
        't.nature',
        't.occurred_on',
        't.description',
        't.bank_counterparty',
        entersAccountsSql('t').as('counts'),
        sql<number>`exists (select 1 from transaction_splits as s where s.transaction_id = t.id)`.as(
          'is_split',
        ),
      ]);
  }

  private static toSnapshot(row: {
    id: string;
    account_id: string;
    amount_cents: number;
    nature: Database['transactions']['nature'];
    occurred_on: string;
    description: string;
    bank_counterparty: string | null;
    counts: boolean;
    is_split: number;
  }): GetOccurrenceTransactionsQuery.Snapshot {
    return {
      id: row.id,
      accountId: row.account_id,
      amountCents: row.amount_cents,
      nature: row.nature,
      isSplit: Boolean(row.is_split),
      counts: Boolean(row.counts),
      occurredOn: row.occurred_on,
      description: row.description,
      counterparty: row.bank_counterparty,
    };
  }
}

export namespace GetOccurrenceTransactionsQuery {
  export type Snapshot = {
    id: string;
    accountId: string;
    // With sign.
    amountCents: number;
    nature: Database['transactions']['nature'];
    isSplit: boolean;
    counts: boolean;
    occurredOn: string;
    description: string;
    counterparty: string | null;
  };
}
