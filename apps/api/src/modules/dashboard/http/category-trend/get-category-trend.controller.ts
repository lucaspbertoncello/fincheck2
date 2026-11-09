import type { GetCategoryTrendQuery } from '#/modules/dashboard/application/category-trend/get-category-trend.query.ts';

export class GetCategoryTrendController {
  private readonly getCategoryTrend: GetCategoryTrendQuery;

  constructor(getCategoryTrend: GetCategoryTrendQuery) {
    this.getCategoryTrend = getCategoryTrend;
  }

  async handle(
    request: GetCategoryTrendController.Request,
  ): Promise<GetCategoryTrendController.Response> {
    return this.getCategoryTrend.execute({ id: request.params.id, until: request.query.until });
  }
}

export namespace GetCategoryTrendController {
  export type Request = { params: { id: string }; query: { until?: string | undefined } };
  export type Response = GetCategoryTrendQuery.Output;
}
