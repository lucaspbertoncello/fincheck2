import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { competenceOnSql } from '#/modules/transactions/application/transaction/competence-on-sql.util.ts';
import { inReviewSql } from '#/modules/transactions/application/transaction/in-review-sql.util.ts';

// How many transactions wait in "Para revisar" (BR-CAT-008) and how much they add up to, for the
// shortcuts of `dashboard`, which asks it through its `ReviewReader` (this class satisfies it).
// `countInPeriod` counts by competence between two days (both ends included, either may be left
// out); `countByAccount` is the whole queue, with no month. The same criterion as the queue.
export class CountReviewQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async countInPeriod(period: {
    from?: string;
    to?: string;
  }): Promise<{ count: number; totalCents: number }> {
    const competence = competenceOnSql('t', 'p');
    let query = this.db
      .selectFrom('transactions as t')
      .leftJoin('installment_plans as p', 'p.id', 't.installment_plan_id')
      .where(inReviewSql('t'));
    if (period.from !== undefined) query = query.where(competence, '>=', period.from);
    if (period.to !== undefined) query = query.where(competence, '<=', period.to);

    const row = await query
      .select([
        sql<number>`count(*)`.as('count'),
        sql<number>`coalesce(sum(abs(t.amount_cents)), 0)`.as('total_cents'),
      ])
      .executeTakeFirstOrThrow();

    return { count: Number(row.count), totalCents: Number(row.total_cents) };
  }

  async countByAccount(): Promise<{ accountId: string; count: number }[]> {
    const rows = await this.db
      .selectFrom('transactions as t')
      .where(inReviewSql('t'))
      .select(['t.account_id as account_id', sql<number>`count(*)`.as('count')])
      .groupBy('t.account_id')
      .orderBy('t.account_id')
      .execute();

    return rows.map((row) => ({ accountId: row.account_id, count: Number(row.count) }));
  }
}
