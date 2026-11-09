import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';
import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { competenceOnSql } from '#/modules/transactions/application/transaction/competence-on-sql.util.ts';
import { inReviewSql } from '#/modules/transactions/application/transaction/in-review-sql.util.ts';
import type { RecurrenceCandidateReader } from '#/modules/transactions/application/transaction/recurrence-candidate-reader.interface.ts';
import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { normalizeDescription } from '@fincheck/shared/common/text/normalize-description.util.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

const DEFAULT_LIMIT = 50;

// The queue "Para revisar" (`GET /transactions/review-queue`): the oldest first, one at a time on
// screen. `total` counts the whole queue; `limit` only cuts the items (N8). The suggestions of
// category and the candidates of recurrence come from the owners through their ports; without them
// (not built yet) the lists are empty, which is the truth.
export class GetReviewQueueQuery {
  private readonly db: Kysely<Database>;
  private readonly builder: TransactionDtoBuilder;
  private readonly recurrences: RecurrenceCandidateReader | undefined;

  constructor(
    db: Kysely<Database>,
    builder: TransactionDtoBuilder,
    recurrences: RecurrenceCandidateReader | undefined,
  ) {
    this.db = db;
    this.builder = builder;
    this.recurrences = recurrences;
  }

  async execute(input: GetReviewQueueQuery.Input): Promise<GetReviewQueueQuery.Output> {
    const competence = competenceOnSql('t', 'p');
    let queue = this.db
      .selectFrom('transactions as t')
      .leftJoin('installment_plans as p', 'p.id', 't.installment_plan_id')
      .where(inReviewSql('t'));
    if (input.month) {
      const month = Month.of(input.month);
      queue = queue
        .where(competence, '>=', month.firstDay().value)
        .where(competence, '<=', month.lastDay().value);
    }

    const [total, rows] = await Promise.all([
      queue.select(sql<number>`count(*)`.as('total')).executeTakeFirstOrThrow(),
      queue
        .select('t.id')
        .orderBy('t.occurred_on', 'asc')
        .orderBy('t.created_at', 'asc')
        .orderBy('t.id', 'asc')
        .limit(input.limit ?? DEFAULT_LIMIT)
        .execute(),
    ]);

    const built = await this.builder.buildDetailed(rows.map((row) => row.id));
    const candidates = this.recurrences
      ? await this.recurrences.candidatesFor(
          built.map(({ dto }) => ({
            transactionId: dto.id,
            occurredOn: dto.occurredOn,
            text: normalizeText(
              `${dto.bank?.counterparty ?? ''} ${dto.bank?.description ?? ''} ${dto.description}`,
            ),
            amountCents: Math.abs(dto.amountCents),
            kind: dto.amountCents > 0 ? 'income' : 'expense',
          })),
        )
      : new Map<string, ReviewQueue.ItemDto['recurrenceCandidates']>();

    return {
      total: Number(total.total),
      items: built.map(({ dto, suggestions }) => ({
        transaction: dto,
        categorySuggestions: suggestions.slice(0, 3),
        recurrenceCandidates: candidates.get(dto.id) ?? [],
        rulePattern: normalizeDescription(dto.description),
      })),
    };
  }
}

export namespace GetReviewQueueQuery {
  export type Input = ReviewQueue.Query;
  export type Output = ReviewQueue.Dto;
}
