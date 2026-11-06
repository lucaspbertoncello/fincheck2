import type { ArchiveCategoryUseCase } from '#/modules/categories/application/category/archive-category.usecase.ts';

export class ArchiveCategoryController {
  private readonly archiveCategory: ArchiveCategoryUseCase;

  constructor(archiveCategory: ArchiveCategoryUseCase) {
    this.archiveCategory = archiveCategory;
  }

  async handle(
    request: ArchiveCategoryController.Request,
  ): Promise<ArchiveCategoryController.Response> {
    return this.archiveCategory.execute({ categoryId: request.params.id });
  }
}

export namespace ArchiveCategoryController {
  export type Request = { params: { id: string } };
  export type Response = ArchiveCategoryUseCase.Output;
}
