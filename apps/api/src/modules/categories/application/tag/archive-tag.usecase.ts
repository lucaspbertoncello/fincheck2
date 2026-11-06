import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTagRow } from '#/modules/categories/application/tag/require-tag-row.util.ts';
import type { TagPresenter } from '#/modules/categories/application/tag/tag-presenter.service.ts';
import { TagAlreadyArchivedError } from '#/modules/categories/domain/tag/tag-already-archived.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Arquivar": the tag leaves the choices; the transactions keep it.
export class ArchiveTagUseCase {
  private readonly presenter: TagPresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(presenter: TagPresenter, unitOfWork: UnitOfWork<Kysely<Database>>, clock: Clock) {
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: ArchiveTagUseCase.Input): Promise<ArchiveTagUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const current = await requireTagRow(executor, input.tagId);
      if (current.archived_at !== null) throw new TagAlreadyArchivedError();

      const now = this.clock.now();
      const row = await executor
        .updateTable('tags')
        .set({ archived_at: now, updated_at: now })
        .where('id', '=', current.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.presenter.presentOne(row, executor);
    });
  }
}

export namespace ArchiveTagUseCase {
  export type Input = { tagId: string };
  export type Output = Tag.Dto;
}
