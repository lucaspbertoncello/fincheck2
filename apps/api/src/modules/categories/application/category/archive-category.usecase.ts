import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoryPresenter } from '#/modules/categories/application/category/category-presenter.service.ts';
import { requireCategoryRow } from '#/modules/categories/application/category/require-category-row.util.ts';
import { CategoryAlreadyArchivedError } from '#/modules/categories/domain/category/category-already-archived.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Arquivar" (BR-CAT-002): the category leaves the choices, its transactions stay in it and keep
// adding up in the past months. Its rules stay as they are (N10).
export class ArchiveCategoryUseCase {
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

  async execute(input: ArchiveCategoryUseCase.Input): Promise<ArchiveCategoryUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const current = await requireCategoryRow(executor, input.categoryId);
      if (current.archived_at !== null) throw new CategoryAlreadyArchivedError();

      const now = this.clock.now();
      const row = await executor
        .updateTable('categories')
        .set({ archived_at: now, updated_at: now })
        .where('id', '=', current.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.presenter.presentOne(row, executor);
    });
  }
}

export namespace ArchiveCategoryUseCase {
  export type Input = { categoryId: string };
  export type Output = Category.Dto;
}
