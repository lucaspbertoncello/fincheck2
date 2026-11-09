import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { competenceOnSql } from '#/modules/transactions/application/transaction/competence-on-sql.util.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';

// The lines of spending and income by competence (BR-DSH-001) that `dashboard` reads, through its
// `SpendingLineReader` (this class satisfies it). Same criterion as the month summary of
// `transactions`: what enters the accounts (not ignored, not removed by the bank without an edit),
// only the natures `expense` and `income` (a transfer, an invoice payment, an adjustment, what was
// lent and what was reimbursed are neither), a split transaction by its parts, each on its own
// category and nature, and an installment on the day of the purchase in the month of its invoice.
// One line per transaction, or per part of a split one. The amount has the sign of the
// transaction (an expense is negative, a refund positive); the caller works out spending from it.
export class ListCompetenceLinesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async listLines(input: {
    from?: string;
    to?: string;
    kind?: 'expense' | 'income';
    categoryId?: string;
  }): Promise<ListCompetenceLinesQuery.Line[]> {
    const competence = competenceOnSql('t', 'p');
    const lineCategory = sql<
      string | null
    >`(case when s.id is not null then s.category_id else t.category_id end)`;

    let query = this.db
      .selectFrom('transactions as t')
      .leftJoin('installment_plans as p', 'p.id', 't.installment_plan_id')
      .leftJoin('transaction_splits as s', 's.transaction_id', 't.id')
      .select([
        't.id as transaction_id',
        't.description as description',
        't.occurred_on as occurred_on',
        't.nature as nature',
        't.amount_cents as amount_cents',
        't.category_id as category_id',
        's.id as part_id',
        's.description as part_description',
        's.nature as part_nature',
        's.amount_cents as part_amount_cents',
        's.category_id as part_category_id',
      ])
      .select(competence.as('competence_on'))
      .where(entersAccountsSql('t'));
    if (input.from !== undefined) query = query.where(competence, '>=', input.from);
    if (input.to !== undefined) query = query.where(competence, '<=', input.to);
    if (input.categoryId !== undefined) {
      query = query.where(sql<boolean>`${lineCategory} = ${input.categoryId}`);
    }

    const lines: ListCompetenceLinesQuery.Line[] = [];
    for (const row of await query.execute()) {
      const isPart = row.part_id !== null;
      const nature = isPart ? row.part_nature : row.nature;
      if (nature !== 'expense' && nature !== 'income') continue;
      if (input.kind !== undefined && nature !== input.kind) continue;

      lines.push({
        transactionId: row.transaction_id,
        description: isPart ? (row.part_description ?? row.description) : row.description,
        occurredOn: row.occurred_on,
        on: row.competence_on,
        kind: nature,
        amountCents: isPart ? (row.part_amount_cents ?? 0) : row.amount_cents,
        categoryId: isPart ? row.part_category_id : row.category_id,
      });
    }

    return lines;
  }
}

export namespace ListCompetenceLinesQuery {
  export type Line = {
    transactionId: string;
    // The text in use; for a part of a split transaction, its own text when it has one.
    description: string;
    // The day of the transaction.
    occurredOn: string;
    // The day it counts, by competence.
    on: string;
    kind: 'expense' | 'income';
    // With the sign of the transaction.
    amountCents: number;
    categoryId: string | null;
  };
}
