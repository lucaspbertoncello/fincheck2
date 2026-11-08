import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import type { ListRecurrencesQuery } from '#/modules/recurrences/application/recurrence/list-recurrences.query.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class ListRecurrencesController {
  private readonly ensureOccurrences: EnsureOccurrencesUseCase;
  private readonly listRecurrences: ListRecurrencesQuery;

  constructor(ensureOccurrences: EnsureOccurrencesUseCase, listRecurrences: ListRecurrencesQuery) {
    this.ensureOccurrences = ensureOccurrences;
    this.listRecurrences = listRecurrences;
  }

  async handle(
    request: ListRecurrencesController.Request,
  ): Promise<ListRecurrencesController.Response> {
    await this.ensureOccurrences.execute();
    return this.listRecurrences.execute(request.query);
  }
}

export namespace ListRecurrencesController {
  export type Request = { query: ListRecurrencesQuery.Input };
  export type Response = ListRecurrencesQuery.Output;
}
