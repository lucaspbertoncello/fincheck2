import type { TransactionSummary } from '@fincheck/shared/transactions/transaction-summary/transaction-summary.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { competenceOnSql } from '#/modules/transactions/application/transaction/competence-on-sql.util.ts';
import { computeTransactionSummary } from '#/modules/transactions/application/transaction/compute-transaction-summary.util.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import { inReviewSql } from '#/modules/transactions/application/transaction/in-review-sql.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The totals of the month (`GET /transactions/summary`): spending, income, "Fora da conta" and the
// line "N para revisar". By competence, over what enters the accounts; the sums are in
// `computeTransactionSummary`, which has no database.
export class GetTransactionSummaryQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(
    input: GetTransactionSummaryQuery.Input,
  ): Promise<GetTransactionSummaryQuery.Output> {
    const month = Month.of(input.month);
    const competence = competenceOnSql('t', 'p');

    const rows = await this.db
      .selectFrom('transactions as t')
      .leftJoin('installment_plans as p', 'p.id', 't.installment_plan_id')
      .select(['t.id', 't.nature', 't.amount_cents'])
      .select(inReviewSql('t').as('is_in_review'))
      .where(entersAccountsSql('t'))
      .where(competence, '>=', month.firstDay().value)
      .where(competence, '<=', month.lastDay().value)
      .execute();

    const splits =
      rows.length === 0
        ? []
        : await this.db
            .selectFrom('transaction_splits')
            .select(['transaction_id', 'nature', 'amount_cents'])
            .where(
              'transaction_id',
              'in',
              rows.map((row) => row.id),
            )
            .execute();

    return {
      month: month.value,
      ...computeTransactionSummary(
        rows.map((row) => ({
          nature: row.nature,
          amountCents: row.amount_cents,
          isInReview: Boolean(row.is_in_review),
          splits: splits
            .filter((part) => part.transaction_id === row.id)
            .map((part) => ({ nature: part.nature, amountCents: part.amount_cents })),
        })),
      ),
    };
  }
}

export namespace GetTransactionSummaryQuery {
  export type Input = TransactionSummary.Query;
  export type Output = TransactionSummary.Dto;
}
