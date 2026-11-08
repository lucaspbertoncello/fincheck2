import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireOccurrence } from '#/modules/recurrences/application/occurrence/require-occurrence.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Desvincular" (RF-REC-004). The category the recurrence put on the transaction stays (Lucas
// changes it on the transaction if he wants), and the automatic match does not redo the link: it
// only looks at new transactions from the import.
export class UnlinkOccurrencePaymentUseCase {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    occurrences: OccurrenceRepository<Kysely<Database>>,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.occurrences = occurrences;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UnlinkOccurrencePaymentUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const occurrence = await requireOccurrence(this.occurrences, input.id, executor);
      occurrence.unlink(input.paymentId, this.clock.now());
      await this.occurrences.save(occurrence, executor);
    });
  }
}

export namespace UnlinkOccurrencePaymentUseCase {
  export type Input = OccurrenceContract.PaymentParams;
}
