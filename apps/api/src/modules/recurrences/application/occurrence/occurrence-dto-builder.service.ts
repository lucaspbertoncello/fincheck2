import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import { computeOccurrenceState } from '#/modules/recurrences/domain/occurrence/compute-occurrence-state.util.ts';
import type { OccurrenceState } from '#/modules/recurrences/domain/occurrence/compute-occurrence-state.util.ts';
import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// Joins what an occurrence needs to answer: its recurrence (the name, the kind, the account, the
// method) and what each payment is worth today, which only the transaction knows. From there the
// rules (`computeOccurrenceState`) give the state and the difference, so every route that answers
// an occurrence says the same thing.
export class OccurrenceDtoBuilder {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly transactions: OccurrenceTransactionReader;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    transactions: OccurrenceTransactionReader,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.transactions = transactions;
    this.clock = clock;
  }

  // The occurrences with their recurrence, their counted payments and their state, in the order
  // given. One whose recurrence is gone cannot exist (`CASCADE`), so it is not handled.
  async views(
    occurrences: Occurrence[],
    executor?: Kysely<Database>,
  ): Promise<OccurrenceDtoBuilder.View[]> {
    if (occurrences.length === 0) return [];

    const [recurrences, snapshots] = await Promise.all([
      this.recurrences.findByIds(
        occurrences.map((occurrence) => occurrence.recurrenceId),
        executor,
      ),
      this.transactions.findMany(
        occurrences.flatMap((occurrence) =>
          occurrence.payments.map((payment) => payment.transactionId),
        ),
        executor,
      ),
    ]);
    const recurrenceById = new Map(recurrences.map((recurrence) => [recurrence.id, recurrence]));
    const today = this.clock.today();

    return occurrences.map((occurrence) => {
      const recurrence = recurrenceById.get(occurrence.recurrenceId);
      if (!recurrence) throw new RangeError(`Occurrence ${occurrence.id} has no recurrence`);

      const counted = occurrence.countedPayments((transactionId) => {
        const snapshot = snapshots.get(transactionId);

        return snapshot?.counts
          ? {
              cents: Math.abs(snapshot.amountCents),
              occurredOn: BusinessDate.of(snapshot.occurredOn),
              description: snapshot.description,
            }
          : null;
      });
      const state = computeOccurrenceState({
        expectedCents: occurrence.expectedAmount.cents,
        paymentCents: counted.map((item) => item.cents),
        settled: occurrence.settledAt !== null,
        skipped: occurrence.skippedAt !== null,
        windowEndOn: occurrence.windowEndOn,
        today,
        differenceDecision: occurrence.differenceDecision,
        amountMode: recurrence.amountMode,
      });

      return { occurrence, recurrence, counted, state };
    });
  }

  async build(
    occurrences: Occurrence[],
    executor?: Kysely<Database>,
  ): Promise<OccurrenceContract.Dto[]> {
    return (await this.views(occurrences, executor)).map((view) =>
      OccurrenceDtoBuilder.toDto(view),
    );
  }

  async buildOne(
    occurrence: Occurrence,
    executor?: Kysely<Database>,
  ): Promise<OccurrenceContract.Dto> {
    const [dto] = await this.build([occurrence], executor);
    if (!dto) throw new RangeError('The occurrence was not built');

    return dto;
  }

  static toDto(
    view: OccurrenceDtoBuilder.View,
    options: { carriedOver?: boolean } = {},
  ): OccurrenceContract.Dto {
    const { occurrence, recurrence, counted, state } = view;

    return {
      id: occurrence.id,
      recurrenceId: occurrence.recurrenceId,
      recurrenceName: recurrence.name,
      kind: recurrence.kind,
      month: occurrence.month.value,
      expectedOn: occurrence.expectedOn?.value ?? null,
      windowStartOn: occurrence.windowStartOn.value,
      windowEndOn: occurrence.windowEndOn.value,
      expectedAmountCents: occurrence.expectedAmount.cents,
      receivedCents: state.receivedCents,
      remainingCents: state.remainingCents,
      status: state.status,
      settledAt: occurrence.settledAt,
      skippedAt: occurrence.skippedAt,
      difference: state.difference,
      needsAttention: state.needsAttention,
      carriedOver: options.carriedOver ?? false,
      payments: counted.map((item) => ({
        id: item.payment.id,
        transactionId: item.payment.transactionId,
        amountCents: item.cents,
        occurredOn: item.occurredOn.value,
        description: item.description,
        linkedBy: item.payment.linkedBy,
      })),
      accountId: recurrence.accountId,
      method: recurrence.method,
    };
  }
}

export namespace OccurrenceDtoBuilder {
  export type View = {
    occurrence: Occurrence;
    recurrence: Recurrence;
    // The payments that count, oldest first, each worth what its transaction is worth now.
    counted: Occurrence.CountedPayment[];
    state: OccurrenceState;
  };
}
