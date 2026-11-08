import type { ListOccurrenceCandidatesQuery } from '#/modules/recurrences/application/occurrence/list-occurrence-candidates.query.ts';

export class ListOccurrenceCandidatesController {
  private readonly listOccurrenceCandidates: ListOccurrenceCandidatesQuery;

  constructor(listOccurrenceCandidates: ListOccurrenceCandidatesQuery) {
    this.listOccurrenceCandidates = listOccurrenceCandidates;
  }

  async handle(
    request: ListOccurrenceCandidatesController.Request,
  ): Promise<ListOccurrenceCandidatesController.Response> {
    return this.listOccurrenceCandidates.execute(request.params);
  }
}

export namespace ListOccurrenceCandidatesController {
  export type Request = { params: ListOccurrenceCandidatesQuery.Input };
  export type Response = ListOccurrenceCandidatesQuery.Output;
}
