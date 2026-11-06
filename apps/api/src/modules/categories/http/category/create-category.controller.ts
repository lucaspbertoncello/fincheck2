import type { CreateCategoryUseCase } from '#/modules/categories/application/category/create-category.usecase.ts';

export class CreateCategoryController {
  private readonly createCategory: CreateCategoryUseCase;

  constructor(createCategory: CreateCategoryUseCase) {
    this.createCategory = createCategory;
  }

  async handle(
    request: CreateCategoryController.Request,
  ): Promise<CreateCategoryController.Response> {
    return this.createCategory.execute(request.body);
  }
}

export namespace CreateCategoryController {
  export type Request = { body: CreateCategoryUseCase.Input };
  export type Response = CreateCategoryUseCase.Output;
}
