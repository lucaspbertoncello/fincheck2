import type { UnarchiveCategoryUseCase } from '#/modules/categories/application/category/unarchive-category.usecase.ts';

export class UnarchiveCategoryController {
  private readonly unarchiveCategory: UnarchiveCategoryUseCase;

  constructor(unarchiveCategory: UnarchiveCategoryUseCase) {
    this.unarchiveCategory = unarchiveCategory;
  }

  async handle(
    request: UnarchiveCategoryController.Request,
  ): Promise<UnarchiveCategoryController.Response> {
    return this.unarchiveCategory.execute({ categoryId: request.params.id });
  }
}

export namespace UnarchiveCategoryController {
  export type Request = { params: { id: string } };
  export type Response = UnarchiveCategoryUseCase.Output;
}
