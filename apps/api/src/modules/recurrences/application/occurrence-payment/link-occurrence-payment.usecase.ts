import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import { requireOccurrence } from '#/modules/recurrences/application/occurrence/require-occurrence.util.ts';
import type { OccurrencePaymentLinker } from '#/modules/recurrences/application/occurrence-payment/occurrence-payment-linker.service.ts';
import type { LinkedElsewhereReader } from '#/modules/recurrences/application/occurrence-payment/linked-elsewhere-reader.interface.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import { requireRecurrence } from '#/modules/recurrences/application/recurrence/require-recurrence.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import { OccurrenceSkippedError } from '#/modules/recurrences/domain/occurrence/occurrence-skipped.error.ts';
import { assertTransactionCanPayOccurrence } from '#/modules/recurrences/domain/occurrence-payment/assert-transaction-can-pay-occurrence.util.ts';
import { OccurrenceTransactionAlreadyLinkedError } from '#/modules/recurrences/domain/occurrence-payment/occurrence-transaction-already-linked.error.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Vincular transação" (RF-REC-004, 005): Lucas picks the transaction that paid the occurrence, even
// one outside the window; it may pass what was expected (it becomes a difference). Writes the
// payment, puts the category of the recurrence on the transaction when it has none, and answers the
// occurrence with the link inside. The order of the errors: the occurrence and the transaction that
// do not exist (404), the occurrence skipped and the transaction of the wrong kind (422), the
// transaction already linked (409).
export class LinkOccurrencePaymentUseCase {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly transactions: OccurrenceTransactionReader;
  private readonly linker: OccurrencePaymentLinker;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly linkedElsewhere: LinkedElsewhereReader | undefined;

  constructor(
    occurrences: OccurrenceRepository<Kysely<Database>>,
    recurrences: RecurrenceRepository<Kysely<Database>>,
    transactions: OccurrenceTransactionReader,
    linker: OccurrencePaymentLinker,
    builder: OccurrenceDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    linkedElsewhere?: LinkedElsewhereReader,
  ) {
    this.linkedElsewhere = linkedElsewhere;
    this.occurrences = occurrences;
    this.recurrences = recurrences;
    this.transactions = transactions;
    this.linker = linker;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
  }

  async execute(
    input: LinkOccurrencePaymentUseCase.Input,
  ): Promise<LinkOccurrencePaymentUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const occurrence = await requireOccurrence(this.occurrences, input.id, executor);
      const transaction = await this.transactions.requireOne(input.transactionId, executor);
      const recurrence = await requireRecurrence(
        this.recurrences,
        occurrence.recurrenceId,
        executor,
      );

      if (occurrence.skippedAt !== null) throw new OccurrenceSkippedError();
      assertTransactionCanPayOccurrence({
        kind: recurrence.kind,
        amountCents: transaction.amountCents,
        nature: transaction.nature,
        counts: transaction.counts,
        isOnCard: transaction.isOnCard,
      });
      const [linked, linkedThere] = await Promise.all([
        this.occurrences.findLinkedTransactionIds([transaction.id], executor),
        this.linkedElsewhere?.findLinkedTransactionIds([transaction.id], executor),
      ]);
      if (linked.has(transaction.id) || linkedThere?.has(transaction.id)) {
        throw new OccurrenceTransactionAlreadyLinkedError();
      }

      await this.linker.link({ occurrence, recurrence, transaction, linkedBy: 'user' }, executor);

      return this.builder.buildOne(occurrence, executor);
    });
  }
}

export namespace LinkOccurrencePaymentUseCase {
  export type Input = OccurrenceContract.Params & OccurrenceContract.LinkPaymentRequest;
  export type Output = OccurrenceContract.Dto;
}
