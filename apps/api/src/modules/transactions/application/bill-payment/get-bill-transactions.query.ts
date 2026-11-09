import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import { TransactionNotFoundError } from '#/modules/transactions/domain/transaction/transaction-not-found.error.ts';

// What `bills` needs of the transactions that pay a bill, that a bill originates from, or that
// Lucas may pick: the amount in use, the account, the nature, whether it is split, whether it
// counts (not ignored, not removed by the bank without an edit), the day, the description in use,
// the bank's and who sent it, and how much of it is the part of a friend (`lent`). `bills` asks it
// through its `BillTransactionReader`, which this class satisfies. `requireOne` throws
// `TRANSACTION_NOT_FOUND`.
export class GetBillTransactionsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findMany(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, GetBillTransactionsQuery.Snapshot>> {
    const unique = [...new Set(transactionIds)];
    if (unique.length === 0) return new Map();

    const rows = await this.select(executor).where('t.id', 'in', unique).execute();

    return new Map(rows.map((row) => [row.id, GetBillTransactionsQuery.toSnapshot(row)]));
  }

  async requireOne(
    transactionId: string,
    executor: Kysely<Database> = this.db,
  ): Promise<GetBillTransactionsQuery.Snapshot> {
    const snapshot = (await this.findMany([transactionId], executor)).get(transactionId);
    if (!snapshot) throw new TransactionNotFoundError();

    return snapshot;
  }

  async findCandidates(
    criteria: { kind: 'income' | 'expense'; from: string; to: string },
    executor: Kysely<Database> = this.db,
  ): Promise<GetBillTransactionsQuery.Snapshot[]> {
    const rows = await this.select(executor)
      .where('t.nature', '=', criteria.kind)
      // A purchase on the credit card is paid by the invoice, not by a Pix or a debit.
      .where('t.method', '<>', 'credit')
      .where('t.amount_cents', criteria.kind === 'income' ? '>' : '<', 0)
      .where('t.occurred_on', '>=', criteria.from)
      .where('t.occurred_on', '<=', criteria.to)
      .where(entersAccountsSql('t'))
      .execute();

    return rows.map((row) => GetBillTransactionsQuery.toSnapshot(row));
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
        't.bank_description',
        't.bank_counterparty',
        entersAccountsSql('t').as('counts'),
        sql<number>`exists (select 1 from transaction_splits as s where s.transaction_id = t.id)`.as(
          'is_split',
        ),
        sql<number>`case when t.nature = 'lent' then abs(t.amount_cents) else coalesce((select sum(abs(s.amount_cents)) from transaction_splits as s where s.transaction_id = t.id and s.nature = 'lent'), 0) end`.as(
          'lent_cents',
        ),
      ]);
  }

  private static toSnapshot(row: {
    id: string;
    account_id: string;
    amount_cents: number;
    nature: string;
    occurred_on: string;
    description: string;
    bank_description: string | null;
    bank_counterparty: string | null;
    counts: boolean;
    is_split: number;
    lent_cents: number;
  }): GetBillTransactionsQuery.Snapshot {
    return {
      id: row.id,
      accountId: row.account_id,
      amountCents: row.amount_cents,
      nature: row.nature,
      isSplit: Boolean(row.is_split),
      counts: Boolean(row.counts),
      occurredOn: row.occurred_on,
      description: row.description,
      bankDescription: row.bank_description,
      counterparty: row.bank_counterparty,
      lentCents: Number(row.lent_cents),
    };
  }
}

export namespace GetBillTransactionsQuery {
  export type Snapshot = {
    id: string;
    accountId: string;
    // With sign.
    amountCents: number;
    nature: string;
    isSplit: boolean;
    counts: boolean;
    occurredOn: string;
    description: string;
    bankDescription: string | null;
    counterparty: string | null;
    lentCents: number;
  };
}
