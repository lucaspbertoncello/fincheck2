import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { buildMatchCandidates } from '#/modules/recurrences/application/matching/build-match-candidates.util.ts';
import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { OccurrencePaymentLinker } from '#/modules/recurrences/application/occurrence-payment/occurrence-payment-linker.service.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import { matchTransactionToOccurrences } from '#/modules/recurrences/domain/matching/match-transaction-to-occurrences.util.ts';
import type { MatchCandidate } from '#/modules/recurrences/domain/matching/match-transaction-to-occurrences.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import { assertTransactionCanPayOccurrence } from '#/modules/recurrences/domain/occurrence-payment/assert-transaction-can-pay-occurrence.util.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';

// The automatic match of the import (BR-REC-006, 010, 012): the new transactions of a round that
// settle exactly one occurrence are tied to it (`linkedBy = auto`) with the same linker as "Vincular".
// First the occurrences that are missing are made ready. The rule is `matchTransactionToOccurrences`,
// the same one the review queue uses to offer candidates: one match links, several link only when one
// is exact, otherwise the transaction stays in the queue with the candidates. The transactions go in
// date order, and after each link the open occurrences are read again, because a payment changes what
// is still left (`maxPayments`, the remaining value). Runs inside the unit of work of the round, with
// its executor.
export class AutoMatchOccurrencesUseCase {
  private readonly ensure: EnsureOccurrencesUseCase;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly transactions: OccurrenceTransactionReader;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly linker: OccurrencePaymentLinker;

  constructor(
    ensure: EnsureOccurrencesUseCase,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    recurrences: RecurrenceRepository<Kysely<Database>>,
    transactions: OccurrenceTransactionReader,
    builder: OccurrenceDtoBuilder,
    linker: OccurrencePaymentLinker,
  ) {
    this.ensure = ensure;
    this.occurrences = occurrences;
    this.recurrences = recurrences;
    this.transactions = transactions;
    this.builder = builder;
    this.linker = linker;
  }

  async execute(
    input: AutoMatchOccurrencesUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<AutoMatchOccurrencesUseCase.Output> {
    await this.ensure.execute(executor);

    const snapshots = await this.transactions.findMany(input.transactionIds, executor);
    // Only an income that came in or an expense that went out, whole and counting: the rest pays no
    // occurrence (`assertTransactionCanPayOccurrence`).
    const eligible = [...snapshots.values()]
      .filter(
        (snapshot) =>
          snapshot.counts &&
          !snapshot.isSplit &&
          ((snapshot.nature === 'income' && snapshot.amountCents > 0) ||
            (snapshot.nature === 'expense' && snapshot.amountCents < 0)),
      )
      .toSorted((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id));
    if (eligible.length === 0) return { linkedCount: 0 };

    const alreadyLinked = await this.occurrences.findLinkedTransactionIds(
      eligible.map((snapshot) => snapshot.id),
      executor,
    );
    const latest = eligible.at(-1)?.occurredOn ?? '';
    let candidates = await this.loadCandidates(latest, executor);
    let linkedCount = 0;

    for (const snapshot of eligible) {
      if (alreadyLinked.has(snapshot.id) || candidates.length === 0) continue;

      const decision = matchTransactionToOccurrences({
        transaction: {
          occurredOn: snapshot.occurredOn,
          kind: snapshot.amountCents > 0 ? 'income' : 'expense',
          amountCents: Math.abs(snapshot.amountCents),
          text: normalizeText(`${snapshot.counterparty ?? ''} ${snapshot.description}`),
        },
        candidates,
      });
      if (decision.type !== 'link') continue;

      const occurrence = await this.occurrences.findById(decision.occurrenceId, executor);
      const recurrence = occurrence
        ? await this.recurrences.findById(occurrence.recurrenceId, executor)
        : null;
      if (!occurrence || !recurrence || occurrence.skippedAt !== null) continue;
      assertTransactionCanPayOccurrence({
        kind: recurrence.kind,
        amountCents: snapshot.amountCents,
        nature: snapshot.nature,
        counts: snapshot.counts,
      });

      await this.linker.link(
        { occurrence, recurrence, transaction: snapshot, linkedBy: 'auto' },
        executor,
      );
      linkedCount += 1;
      candidates = await this.loadCandidates(latest, executor);
    }

    return { linkedCount };
  }

  private async loadCandidates(
    date: string,
    executor: Kysely<Database>,
  ): Promise<MatchCandidate[]> {
    const open = await this.occurrences.findOpenForMatching(date, executor);

    return buildMatchCandidates(await this.builder.views(open, executor));
  }
}

export namespace AutoMatchOccurrencesUseCase {
  export type Input = { transactionIds: string[] };
  export type Output = { linkedCount: number };
}
