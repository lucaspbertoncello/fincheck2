import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { assertCategoryNameFree } from '#/modules/categories/application/category/assert-category-name-free.util.ts';
import type { CategoryPresenter } from '#/modules/categories/application/category/category-presenter.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Nova categoria" (RF-CAT-002): it is never a default one (those come from the seed).
export class CreateCategoryUseCase {
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

  async execute(input: CreateCategoryUseCase.Input): Promise<CreateCategoryUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      await assertCategoryNameFree(executor, { kind: input.kind, name: input.name });

      const now = this.clock.now();
      const row = await executor
        .insertInto('categories')
        .values({
          id: generateId(),
          kind: input.kind,
          name: input.name,
          icon: input.icon,
          is_default: 0,
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

export namespace CreateCategoryUseCase {
  export type Input = Category.CreateRequest;
  export type Output = Category.Dto;
}
