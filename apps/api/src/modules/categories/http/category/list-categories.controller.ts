import type { ListCategoriesQuery } from '#/modules/categories/application/category/list-categories.query.ts';

export class ListCategoriesController {
  private readonly listCategories: ListCategoriesQuery;

  constructor(listCategories: ListCategoriesQuery) {
    this.listCategories = listCategories;
  }

  async handle(
    request: ListCategoriesController.Request,
  ): Promise<ListCategoriesController.Response> {
    return this.listCategories.execute(request.query);
  }
}

export namespace ListCategoriesController {
  export type Request = { query: ListCategoriesQuery.Input };
  export type Response = ListCategoriesQuery.Output;
}
