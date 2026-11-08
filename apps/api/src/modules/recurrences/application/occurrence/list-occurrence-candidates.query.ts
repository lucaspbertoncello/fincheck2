import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import { requireOccurrence } from '#/modules/recurrences/application/occurrence/require-occurrence.util.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';

// The days around the window in which a transaction may be offered.
const CANDIDATE_MARGIN_DAYS = 15;

// "Vincular transação" (RF-REC-004): the transactions Lucas may pick as the payment. The same kind
// (an income takes a credit of nature income, an expense a debit of nature expense), that count,
// not tied to any occurrence, within 15 days of the window. The closest to what is left come first
// (to the expected amount when nothing is left), then the newest.
export class ListOccurrenceCandidatesQuery {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly transactions: OccurrenceTransactionReader;
  private readonly builder: OccurrenceDtoBuilder;

  constructor(
    occurrences: OccurrenceRepository<Kysely<Database>>,
    transactions: OccurrenceTransactionReader,
    builder: OccurrenceDtoBuilder,
  ) {
    this.occurrences = occurrences;
    this.transactions = transactions;
    this.builder = builder;
  }

  async execute(
    input: ListOccurrenceCandidatesQuery.Input,
  ): Promise<ListOccurrenceCandidatesQuery.Output> {
    const occurrence = await requireOccurrence(this.occurrences, input.id);
    const [view] = await this.builder.views([occurrence]);
    if (!view) throw new RangeError('The occurrence was not built');

    const { state } = view;
    const target =
      state.remainingCents > 0 ? state.remainingCents : occurrence.expectedAmount.cents;
    const found = await this.transactions.findCandidates({
      kind: view.recurrence.kind,
      from: occurrence.windowStartOn.addDays(-CANDIDATE_MARGIN_DAYS).value,
      to: occurrence.windowEndOn.addDays(CANDIDATE_MARGIN_DAYS).value,
    });
    const linked = await this.occurrences.findLinkedTransactionIds(found.map((item) => item.id));

    const items = found
      .filter((item) => !linked.has(item.id))
      .toSorted(
        (a, b) =>
          Math.abs(Math.abs(a.amountCents) - target) - Math.abs(Math.abs(b.amountCents) - target) ||
          b.occurredOn.localeCompare(a.occurredOn) ||
          b.id.localeCompare(a.id),
      )
      .map((item) => ({
        transactionId: item.id,
        description: item.description,
        occurredOn: item.occurredOn,
        amountCents: item.amountCents,
        accountId: item.accountId,
        counterparty: item.counterparty,
      }));

    return { items };
  }
}

export namespace ListOccurrenceCandidatesQuery {
  export type Input = OccurrenceContract.Params;
  export type Output = { items: OccurrenceContract.CandidateDto[] };
}
