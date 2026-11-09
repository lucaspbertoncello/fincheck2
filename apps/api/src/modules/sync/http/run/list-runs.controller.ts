import type { ListRunsQuery } from '#/modules/sync/application/run/list-runs.query.ts';

export class ListRunsController {
  private readonly listRuns: ListRunsQuery;

  constructor(listRuns: ListRunsQuery) {
    this.listRuns = listRuns;
  }

  async handle(request: ListRunsController.Request): Promise<ListRunsController.Response> {
    return this.listRuns.execute({ connectionId: request.params.id });
  }
}

export namespace ListRunsController {
  export type Request = { params: { id: string } };
  export type Response = ListRunsQuery.Output;
}
