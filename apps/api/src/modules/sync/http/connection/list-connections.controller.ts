import type { ListConnectionsQuery } from '#/modules/sync/application/connection/list-connections.query.ts';

export class ListConnectionsController {
  private readonly listConnections: ListConnectionsQuery;

  constructor(listConnections: ListConnectionsQuery) {
    this.listConnections = listConnections;
  }

  async handle(): Promise<ListConnectionsController.Response> {
    return this.listConnections.execute();
  }
}

export namespace ListConnectionsController {
  export type Response = ListConnectionsQuery.Output;
}
