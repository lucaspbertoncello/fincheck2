import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { competenceOnSql } from '#/modules/transactions/application/transaction/competence-on-sql.util.ts';
import { decodeTransactionCursor } from '#/modules/transactions/application/transaction/decode-transaction-cursor.util.ts';
import { encodeTransactionCursor } from '#/modules/transactions/application/transaction/encode-transaction-cursor.util.ts';
import { escapeLikePattern } from '#/modules/transactions/application/transaction/escape-like-pattern.util.ts';
import { inReviewSql } from '#/modules/transactions/application/transaction/in-review-sql.util.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const DEFAULT_LIMIT = 100;

// The list of transactions (`GET /transactions`). Every filter combines with AND. The order is by
// competence first, in every mode (PM, N1): the competence date of an installment is the day of the
// purchase in the month of its invoice, so a page never brings an item above what is on screen.
// With `month` the whole month comes back; otherwise the list is read page by page, by a cursor
// that carries the sort key of the last item. Ignored transactions come along.
export class ListTransactionsQuery {
  private readonly db: Kysely<Database>;
  private readonly accounts: TransactionAccountReader;
  private readonly builder: TransactionDtoBuilder;

  constructor(
    db: Kysely<Database>,
    accounts: TransactionAccountReader,
    builder: TransactionDtoBuilder,
  ) {
    this.db = db;
    this.accounts = accounts;
    this.builder = builder;
  }

  async execute(input: ListTransactionsQuery.Input): Promise<ListTransactionsQuery.Output> {
    if (input.accountId) await this.accounts.requireAccount(input.accountId);

    const competence = competenceOnSql('t', 'p');
    let query = this.db
      .selectFrom('transactions as t')
      .leftJoin('installment_plans as p', 'p.id', 't.installment_plan_id')
      .select(['t.id', 't.occurred_on', 't.created_at'])
      .select(competence.as('competence_on'));

    if (input.month) {
      const month = Month.of(input.month);
      query = query
        .where(competence, '>=', month.firstDay().value)
        .where(competence, '<=', month.lastDay().value);
    }
    if (input.from) query = query.where(competence, '>=', input.from);
    if (input.to) query = query.where(competence, '<=', input.to);
    if (input.accountId) query = query.where('t.account_id', '=', input.accountId);
    if (input.categoryId) {
      const categoryId = input.categoryId;
      query = query.where((eb) =>
        eb.or([
          eb('t.category_id', '=', categoryId),
          eb.exists(
            eb
              .selectFrom('transaction_splits as s')
              .select('s.id')
              .whereRef('s.transaction_id', '=', 't.id')
              .where('s.category_id', '=', categoryId),
          ),
        ]),
      );
    }
    if (input.uncategorized !== undefined) {
      query = query.where(
        input.uncategorized ? inReviewSql('t') : sql<boolean>`not ${inReviewSql('t')}`,
      );
    }
    if (input.tagId) {
      const tagId = input.tagId;
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('transaction_tags as g')
            .select('g.tag_id')
            .whereRef('g.transaction_id', '=', 't.id')
            .where('g.tag_id', '=', tagId),
        ),
      );
    }
    if (input.ruleId) query = query.where('t.category_rule_id', '=', input.ruleId);
    if (input.direction) {
      query = query.where('t.amount_cents', input.direction === 'out' ? '<' : '>', 0);
    }
    if (input.installmentPlanId) {
      query = query.where('t.installment_plan_id', '=', input.installmentPlanId);
    }
    if (input.search) {
      const pattern = `%${escapeLikePattern(normalizeText(input.search))}%`;
      query = query.where(sql<boolean>`t.search_text like ${pattern} escape '\\'`);
    }
    if (input.cursor) {
      const [cursorCompetence, cursorOccurred, cursorCreated, cursorId] = decodeTransactionCursor(
        input.cursor,
      );
      query = query.where(
        sql<boolean>`(${competence}, t.occurred_on, t.created_at, t.id) < (${cursorCompetence}, ${cursorOccurred}, ${cursorCreated}, ${cursorId})`,
      );
    }

    query = query
      .orderBy(competence, 'desc')
      .orderBy('t.occurred_on', 'desc')
      .orderBy('t.created_at', 'desc')
      .orderBy('t.id', 'desc');

    if (input.month) {
      const rows = await query.execute();

      return { items: await this.builder.buildByIds(rows.map((row) => row.id)), nextCursor: null };
    }

    const limit = input.limit ?? DEFAULT_LIMIT;
    const rows = await query.limit(limit + 1).execute();
    const page = rows.slice(0, limit);
    const last = page.at(-1);

    return {
      items: await this.builder.buildByIds(page.map((row) => row.id)),
      nextCursor:
        rows.length > limit && last
          ? encodeTransactionCursor([
              last.competence_on,
              last.occurred_on,
              last.created_at,
              last.id,
            ])
          : null,
    };
  }
}

export namespace ListTransactionsQuery {
  export type Input = TransactionContract.ListQuery;
  export type Output = TransactionContract.ListResponse;
}
