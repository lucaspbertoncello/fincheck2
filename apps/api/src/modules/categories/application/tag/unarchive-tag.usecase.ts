import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTagRow } from '#/modules/categories/application/tag/require-tag-row.util.ts';
import type { TagPresenter } from '#/modules/categories/application/tag/tag-presenter.service.ts';
import { TagNotArchivedError } from '#/modules/categories/domain/tag/tag-not-archived.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Desarquivar": the tag comes back to the choices.
export class UnarchiveTagUseCase {
  private readonly presenter: TagPresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(presenter: TagPresenter, unitOfWork: UnitOfWork<Kysely<Database>>, clock: Clock) {
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UnarchiveTagUseCase.Input): Promise<UnarchiveTagUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const current = await requireTagRow(executor, input.tagId);
      if (current.archived_at === null) throw new TagNotArchivedError();

      const row = await executor
        .updateTable('tags')
        .set({ archived_at: null, updated_at: this.clock.now() })
        .where('id', '=', current.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.presenter.presentOne(row, executor);
    });
  }
}

export namespace UnarchiveTagUseCase {
  export type Input = { tagId: string };
  export type Output = Tag.Dto;
}
