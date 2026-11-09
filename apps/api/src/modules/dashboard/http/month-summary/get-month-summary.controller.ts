import type { OccurrenceEnsurer } from '#/modules/dashboard/application/occurrence/occurrence-ensurer.interface.ts';
import type { GetMonthSummaryQuery } from '#/modules/dashboard/application/month-summary/get-month-summary.query.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class GetMonthSummaryController {
  private readonly ensureOccurrences: OccurrenceEnsurer;
  private readonly getMonthSummary: GetMonthSummaryQuery;

  constructor(ensureOccurrences: OccurrenceEnsurer, getMonthSummary: GetMonthSummaryQuery) {
    this.ensureOccurrences = ensureOccurrences;
    this.getMonthSummary = getMonthSummary;
  }

  async handle(
    request: GetMonthSummaryController.Request,
  ): Promise<GetMonthSummaryController.Response> {
    await this.ensureOccurrences.execute();

    return this.getMonthSummary.execute(request.query);
  }
}

export namespace GetMonthSummaryController {
  export type Request = { query: GetMonthSummaryQuery.Input };
  export type Response = GetMonthSummaryQuery.Output;
}
