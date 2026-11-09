import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { assertTagNameFree } from '#/modules/categories/application/tag/assert-tag-name-free.util.ts';
import { requireTagRow } from '#/modules/categories/application/tag/require-tag-row.util.ts';
import type { TagPresenter } from '#/modules/categories/application/tag/tag-presenter.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Renomear": the transactions and the rules keep the tag, they point to it by id.
export class UpdateTagUseCase {
  private readonly presenter: TagPresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(presenter: TagPresenter, unitOfWork: UnitOfWork<Kysely<Database>>, clock: Clock) {
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UpdateTagUseCase.Input): Promise<UpdateTagUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const current = await requireTagRow(executor, input.tagId);
      await assertTagNameFree(executor, {
        categoryId: current.category_id,
        name: input.body.name,
        exceptId: current.id,
      });

      const row = await executor
        .updateTable('tags')
        .set({ name: input.body.name, updated_at: this.clock.now() })
        .where('id', '=', current.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.presenter.presentOne(row, executor);
    });
  }
}

export namespace UpdateTagUseCase {
  export type Input = { tagId: string; body: Tag.UpdateRequest };
  export type Output = Tag.Dto;
}
