import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import type { ListSubscriptionsQuery } from '#/modules/recurrences/application/subscription/list-subscriptions.query.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class ListSubscriptionsController {
  private readonly ensureOccurrences: EnsureOccurrencesUseCase;
  private readonly listSubscriptions: ListSubscriptionsQuery;

  constructor(
    ensureOccurrences: EnsureOccurrencesUseCase,
    listSubscriptions: ListSubscriptionsQuery,
  ) {
    this.ensureOccurrences = ensureOccurrences;
    this.listSubscriptions = listSubscriptions;
  }

  async handle(
    request: ListSubscriptionsController.Request,
  ): Promise<ListSubscriptionsController.Response> {
    await this.ensureOccurrences.execute();
    return this.listSubscriptions.execute(request.query);
  }
}

export namespace ListSubscriptionsController {
  export type Request = { query: ListSubscriptionsQuery.Input };
  export type Response = ListSubscriptionsQuery.Output;
}
