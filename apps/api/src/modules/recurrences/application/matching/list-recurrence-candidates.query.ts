import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { buildMatchCandidates } from '#/modules/recurrences/application/matching/build-match-candidates.util.ts';
import type { LinkedElsewhereReader } from '#/modules/recurrences/application/occurrence-payment/linked-elsewhere-reader.interface.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import { matchTransactionToOccurrences } from '#/modules/recurrences/domain/matching/match-transaction-to-occurrences.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';

type Item = {
  transactionId: string;
  occurredOn: string;
  // Sender and description, normalized.
  text: string;
  // Positive.
  amountCents: number;
  kind: 'expense' | 'income';
};

// The occurrences a transaction of the "Para revisar" queue could pay (the allowance and the meal
// voucher, BR-REC-012, RF-REC-007). `transactions` asks it through its `RecurrenceCandidateReader`,
// which this class satisfies. It applies the same rule as the automatic match, with the open
// occurrences of the recurrences that are neither paused nor deleted: one candidate that fits is
// offered (it was not tied by itself, for instance because the recurrence is newer than the
// transaction), several that fit with no tie-break are all offered, and when none fits by value but
// the sender fits, the ones of that sender are. A transaction that already pays an occurrence gets
// none. Oldest month first, then by name.
export class ListRecurrenceCandidatesQuery {
  private readonly db: Kysely<Database>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly linkedElsewhere: LinkedElsewhereReader | undefined;

  constructor(
    db: Kysely<Database>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    builder: OccurrenceDtoBuilder,
    linkedElsewhere?: LinkedElsewhereReader,
  ) {
    this.linkedElsewhere = linkedElsewhere;
    this.db = db;
    this.occurrences = occurrences;
    this.builder = builder;
  }

  async candidatesFor(
    items: Item[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, ReviewQueue.ItemDto['recurrenceCandidates']>> {
    if (items.length === 0) return new Map();

    const latest =
      items
        .map((item) => item.occurredOn)
        .toSorted()
        .at(-1) ?? '';
    const transactionIds = items.map((item) => item.transactionId);
    const [open, linkedHere, linkedThere] = await Promise.all([
      this.occurrences.findOpenForMatching(latest, executor),
      this.occurrences.findLinkedTransactionIds(transactionIds, executor),
      this.linkedElsewhere?.findLinkedTransactionIds(transactionIds, executor),
    ]);
    const linked = new Set([...linkedHere, ...(linkedThere ?? [])]);
    const views = (await this.builder.views(open, executor)).filter(
      (view) =>
        view.state.status === 'expected' ||
        view.state.status === 'partial' ||
        view.state.status === 'late',
    );
    const candidates = buildMatchCandidates(views);
    const viewById = new Map(views.map((view) => [view.occurrence.id, view]));

    const result = new Map<string, ReviewQueue.ItemDto['recurrenceCandidates']>();
    for (const item of items) {
      if (linked.has(item.transactionId)) continue;

      const decision = matchTransactionToOccurrences({
        transaction: {
          occurredOn: item.occurredOn,
          kind: item.kind,
          amountCents: item.amountCents,
          text: item.text,
        },
        candidates,
      });
      const ids =
        decision.type === 'link'
          ? [decision.occurrenceId]
          : decision.type === 'review'
            ? decision.occurrenceIds
            : [];

      const offered = ids.flatMap((id) => {
        const view = viewById.get(id);

        return view
          ? [
              {
                occurrenceId: view.occurrence.id,
                recurrenceId: view.recurrence.id,
                recurrenceName: view.recurrence.name,
                month: view.occurrence.month.value,
                expectedAmountCents: view.occurrence.expectedAmount.cents,
                remainingCents: view.state.remainingCents,
              },
            ]
          : [];
      });
      if (offered.length > 0) {
        result.set(
          item.transactionId,
          offered.toSorted(
            (a, b) =>
              a.month.localeCompare(b.month) ||
              a.recurrenceName.localeCompare(b.recurrenceName, 'pt-BR', { sensitivity: 'base' }),
          ),
        );
      }
    }

    return result;
  }
}
