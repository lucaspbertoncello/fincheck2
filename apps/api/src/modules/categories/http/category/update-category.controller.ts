import type { UpdateCategoryUseCase } from '#/modules/categories/application/category/update-category.usecase.ts';

export class UpdateCategoryController {
  private readonly updateCategory: UpdateCategoryUseCase;

  constructor(updateCategory: UpdateCategoryUseCase) {
    this.updateCategory = updateCategory;
  }

  async handle(
    request: UpdateCategoryController.Request,
  ): Promise<UpdateCategoryController.Response> {
    return this.updateCategory.execute({ categoryId: request.params.id, body: request.body });
  }
}

export namespace UpdateCategoryController {
  export type Request = { params: { id: string }; body: UpdateCategoryUseCase.Input['body'] };
  export type Response = UpdateCategoryUseCase.Output;
}
