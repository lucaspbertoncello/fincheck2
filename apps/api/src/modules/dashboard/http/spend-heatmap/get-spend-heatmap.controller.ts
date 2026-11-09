import type { GetSpendHeatmapQuery } from '#/modules/dashboard/application/spend-heatmap/get-spend-heatmap.query.ts';

export class GetSpendHeatmapController {
  private readonly getSpendHeatmap: GetSpendHeatmapQuery;

  constructor(getSpendHeatmap: GetSpendHeatmapQuery) {
    this.getSpendHeatmap = getSpendHeatmap;
  }

  async handle(
    request: GetSpendHeatmapController.Request,
  ): Promise<GetSpendHeatmapController.Response> {
    return this.getSpendHeatmap.execute(request.query);
  }
}

export namespace GetSpendHeatmapController {
  export type Request = { query: GetSpendHeatmapQuery.Input };
  export type Response = GetSpendHeatmapQuery.Output;
}
