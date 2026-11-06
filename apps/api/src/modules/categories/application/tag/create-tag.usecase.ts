import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { assertTagNameFree } from '#/modules/categories/application/tag/assert-tag-name-free.util.ts';
import type { TagPresenter } from '#/modules/categories/application/tag/tag-presenter.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Nova tag" (RF-CAT-003).
export class CreateTagUseCase {
  private readonly presenter: TagPresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(presenter: TagPresenter, unitOfWork: UnitOfWork<Kysely<Database>>, clock: Clock) {
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: CreateTagUseCase.Input): Promise<CreateTagUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      await assertTagNameFree(executor, { name: input.name });

      const now = this.clock.now();
      const row = await executor
        .insertInto('tags')
        .values({
          id: generateId(),
          name: input.name,
          archived_at: null,
          created_at: now,
          updated_at: now,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.presenter.presentOne(row, executor);
    });
  }
}

export namespace CreateTagUseCase {
  export type Input = Tag.CreateRequest;
  export type Output = Tag.Dto;
}
