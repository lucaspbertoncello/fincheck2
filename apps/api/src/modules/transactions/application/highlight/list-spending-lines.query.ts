import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { competenceOnSql } from '#/modules/transactions/application/transaction/competence-on-sql.util.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';

// The lines of spending between two days, by competence (BR-DSH-001), for the curiosities of the
// profile: `profile` asks it through its `ProfileSpendingReader`, which this class satisfies. Same
// criterion as the month summary: what enters the accounts (not ignored, not removed by the bank),
// only the `expense` nature (a transfer, an invoice payment, an adjustment and what was lent are
// not spending), and a split transaction counts by its `expense` parts, each on its own category.
// A refund comes out negative. One line per transaction, or per part of a split one.
export class ListSpendingLinesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async listSpendingLines(period: {
    from: string;
    to: string;
  }): Promise<ListSpendingLinesQuery.Line[]> {
    const competence = competenceOnSql('t', 'p');

    const rows = await this.db
      .selectFrom('transactions as t')
      .leftJoin('installment_plans as p', 'p.id', 't.installment_plan_id')
      .leftJoin('transaction_splits as s', 's.transaction_id', 't.id')
      .select([
        't.nature as nature',
        't.amount_cents as amount_cents',
        't.category_id as category_id',
        's.id as part_id',
        's.nature as part_nature',
        's.amount_cents as part_amount_cents',
        's.category_id as part_category_id',
      ])
      .select(competence.as('competence_on'))
      .where(entersAccountsSql('t'))
      .where(competence, '>=', period.from)
      .where(competence, '<=', period.to)
      .execute();

    const lines: ListSpendingLinesQuery.Line[] = [];
    for (const row of rows) {
      if (row.part_id !== null) {
        if (row.part_nature === 'expense' && row.part_amount_cents !== null) {
          lines.push({
            on: row.competence_on,
            cents: -row.part_amount_cents,
            categoryId: row.part_category_id,
          });
        }
        continue;
      }
      if (row.nature === 'expense') {
        lines.push({
          on: row.competence_on,
          cents: -row.amount_cents,
          categoryId: row.category_id,
        });
      }
    }

    return lines;
  }
}

export namespace ListSpendingLinesQuery {
  export type Line = {
    // The day it counts as spending.
    on: string;
    // Positive for a purchase, negative for a refund.
    cents: number;
    categoryId: string | null;
  };
}
