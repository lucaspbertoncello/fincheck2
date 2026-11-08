import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import type { ListOccurrencesQuery } from '#/modules/recurrences/application/occurrence/list-occurrences.query.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class ListOccurrencesController {
  private readonly ensureOccurrences: EnsureOccurrencesUseCase;
  private readonly listOccurrences: ListOccurrencesQuery;

  constructor(ensureOccurrences: EnsureOccurrencesUseCase, listOccurrences: ListOccurrencesQuery) {
    this.ensureOccurrences = ensureOccurrences;
    this.listOccurrences = listOccurrences;
  }

  async handle(
    request: ListOccurrencesController.Request,
  ): Promise<ListOccurrencesController.Response> {
    await this.ensureOccurrences.execute();
    return this.listOccurrences.execute(request.query);
  }
}

export namespace ListOccurrencesController {
  export type Request = { query: ListOccurrencesQuery.Input };
  export type Response = ListOccurrencesQuery.Output;
}
