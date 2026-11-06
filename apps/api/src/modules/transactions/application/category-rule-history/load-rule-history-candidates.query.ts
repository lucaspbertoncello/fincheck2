import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The transactions a category rule may look at in the history: expense or income, not ignored and
// not split. A light read (no entity): enough to match a rule and to say what applying it would
// change. Tags come in a second read, grouped by transaction.
export class LoadRuleHistoryCandidatesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(
    executor: Kysely<Database> = this.db,
  ): Promise<LoadRuleHistoryCandidatesQuery.Output> {
    const rows = await executor
      .selectFrom('transactions as t')
      .select([
        't.id',
        't.description',
        't.bank_description',
        't.bank_counterparty',
        't.nature',
        't.account_id',
        't.amount_cents',
        't.occurred_on',
        't.category_id',
        't.category_source',
        't.category_rule_id',
      ])
      .where('t.nature', 'in', ['expense', 'income'])
      .where('t.ignored_at', 'is', null)
      .where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom('transaction_splits as s')
              .select('s.id')
              .whereRef('s.transaction_id', '=', 't.id'),
          ),
        ),
      )
      .execute();
    const tagRows = await executor.selectFrom('transaction_tags').selectAll().execute();

    const tagsByTransaction = new Map<string, string[]>();
    for (const row of tagRows) {
      tagsByTransaction.set(row.transaction_id, [
        ...(tagsByTransaction.get(row.transaction_id) ?? []),
        row.tag_id,
      ]);
    }

    return rows.map((row) => ({
      id: row.id,
      description: row.description,
      bankDescription: row.bank_description,
      counterparty: row.bank_counterparty,
      // The `where` above keeps only these two.
      nature: row.nature as 'expense' | 'income',
      accountId: row.account_id,
      amountCents: row.amount_cents,
      occurredOn: row.occurred_on,
      categoryId: row.category_id,
      categorySource: row.category_source,
      categoryRuleId: row.category_rule_id,
      tagIds: tagsByTransaction.get(row.id) ?? [],
    }));
  }
}

export namespace LoadRuleHistoryCandidatesQuery {
  export type Candidate = {
    id: string;
    // In use.
    description: string;
    bankDescription: string | null;
    counterparty: string | null;
    nature: 'expense' | 'income';
    accountId: string;
    // With sign.
    amountCents: number;
    occurredOn: string;
    categoryId: string | null;
    categorySource: TransactionContract.CategorySource | null;
    categoryRuleId: string | null;
    tagIds: string[];
  };

  export type Output = Candidate[];
}
