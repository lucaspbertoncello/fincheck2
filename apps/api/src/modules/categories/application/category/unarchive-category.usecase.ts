import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoryPresenter } from '#/modules/categories/application/category/category-presenter.service.ts';
import { requireCategoryRow } from '#/modules/categories/application/category/require-category-row.util.ts';
import { CategoryNotArchivedError } from '#/modules/categories/domain/category/category-not-archived.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Desarquivar": the category comes back to the choices. Its name was never freed, so it cannot
// collide.
export class UnarchiveCategoryUseCase {
  private readonly presenter: CategoryPresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    presenter: CategoryPresenter,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UnarchiveCategoryUseCase.Input): Promise<UnarchiveCategoryUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const current = await requireCategoryRow(executor, input.categoryId);
      if (current.archived_at === null) throw new CategoryNotArchivedError();

      const row = await executor
        .updateTable('categories')
        .set({ archived_at: null, updated_at: this.clock.now() })
        .where('id', '=', current.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.presenter.presentOne(row, executor);
    });
  }
}

export namespace UnarchiveCategoryUseCase {
  export type Input = { categoryId: string };
  export type Output = Category.Dto;
}
