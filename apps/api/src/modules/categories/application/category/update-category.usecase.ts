import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { assertCategoryNameFree } from '#/modules/categories/application/category/assert-category-name-free.util.ts';
import type { CategoryPresenter } from '#/modules/categories/application/category/category-presenter.service.ts';
import { requireCategoryRow } from '#/modules/categories/application/category/require-category-row.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Editar" (RF-CAT-002): name and icon. The kind never changes (it is not in the request). It works
// on an archived category too.
export class UpdateCategoryUseCase {
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

  async execute(input: UpdateCategoryUseCase.Input): Promise<UpdateCategoryUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const current = await requireCategoryRow(executor, input.categoryId);
      const name = input.body.name ?? current.name;
      if (input.body.name !== undefined) {
        await assertCategoryNameFree(executor, {
          kind: current.kind,
          name,
          exceptId: current.id,
        });
      }

      const row = await executor
        .updateTable('categories')
        .set({ name, icon: input.body.icon ?? current.icon, updated_at: this.clock.now() })
        .where('id', '=', current.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.presenter.presentOne(row, executor);
    });
  }
}

export namespace UpdateCategoryUseCase {
  export type Input = { categoryId: string; body: Category.UpdateRequest };
  export type Output = Category.Dto;
}
