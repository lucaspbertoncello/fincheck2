import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import type { GetRecurrenceSummaryQuery } from '#/modules/recurrences/application/recurrence/get-recurrence-summary.query.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class GetRecurrenceSummaryController {
  private readonly ensureOccurrences: EnsureOccurrencesUseCase;
  private readonly getRecurrenceSummary: GetRecurrenceSummaryQuery;

  constructor(
    ensureOccurrences: EnsureOccurrencesUseCase,
    getRecurrenceSummary: GetRecurrenceSummaryQuery,
  ) {
    this.ensureOccurrences = ensureOccurrences;
    this.getRecurrenceSummary = getRecurrenceSummary;
  }

  async handle(
    request: GetRecurrenceSummaryController.Request,
  ): Promise<GetRecurrenceSummaryController.Response> {
    await this.ensureOccurrences.execute();
    return this.getRecurrenceSummary.execute(request.query);
  }
}

export namespace GetRecurrenceSummaryController {
  export type Request = { query: GetRecurrenceSummaryQuery.Input };
  export type Response = GetRecurrenceSummaryQuery.Output;
}
