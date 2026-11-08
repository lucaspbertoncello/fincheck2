import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import { requireOccurrence } from '#/modules/recurrences/application/occurrence/require-occurrence.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// The "Desfazer" of marking as paid or received: clears the mark.
export class UnsettleOccurrenceUseCase {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    occurrences: OccurrenceRepository<Kysely<Database>>,
    builder: OccurrenceDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.occurrences = occurrences;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UnsettleOccurrenceUseCase.Input): Promise<UnsettleOccurrenceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const occurrence = await requireOccurrence(this.occurrences, input.id, executor);
      occurrence.unsettle(this.clock.now());
      await this.occurrences.save(occurrence, executor);

      return this.builder.buildOne(occurrence, executor);
    });
  }
}

export namespace UnsettleOccurrenceUseCase {
  export type Input = OccurrenceContract.Params;
  export type Output = OccurrenceContract.Dto;
}
