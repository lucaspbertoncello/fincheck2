import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The transactions Lucas categorized by hand and that count: the raw material of the rule
// suggestions ("you moved UBER *TRIP to Transporte three times") and of the category suggestions
// of the review queue. Not ignored. `categories` asks it through its `ManualCategorizationReader`,
// which this class satisfies.
export class ListManualCategorizationsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(
    executor: Kysely<Database> = this.db,
  ): Promise<ListManualCategorizationsQuery.Output> {
    const rows = await executor
      .selectFrom('transactions as t')
      .select(['t.id', 't.description', 't.category_id'])
      .where('t.category_source', '=', 'user')
      .where('t.category_id', 'is not', null)
      .where('t.ignored_at', 'is', null)
      .where('t.nature', 'in', ['expense', 'income'])
      .execute();

    return rows.flatMap((row) =>
      row.category_id === null
        ? []
        : [{ transactionId: row.id, description: row.description, categoryId: row.category_id }],
    );
  }
}

export namespace ListManualCategorizationsQuery {
  export type Output = { transactionId: string; description: string; categoryId: string }[];
}
