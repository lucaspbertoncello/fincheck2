import type { GetCategoryBreakdownQuery } from '#/modules/dashboard/application/category-breakdown/get-category-breakdown.query.ts';
import type { OccurrenceEnsurer } from '#/modules/dashboard/application/occurrence/occurrence-ensurer.interface.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class GetCategoryBreakdownController {
  private readonly ensureOccurrences: OccurrenceEnsurer;
  private readonly getCategoryBreakdown: GetCategoryBreakdownQuery;

  constructor(
    ensureOccurrences: OccurrenceEnsurer,
    getCategoryBreakdown: GetCategoryBreakdownQuery,
  ) {
    this.ensureOccurrences = ensureOccurrences;
    this.getCategoryBreakdown = getCategoryBreakdown;
  }

  async handle(
    request: GetCategoryBreakdownController.Request,
  ): Promise<GetCategoryBreakdownController.Response> {
    await this.ensureOccurrences.execute();

    return this.getCategoryBreakdown.execute(request.query);
  }
}

export namespace GetCategoryBreakdownController {
  export type Request = { query: GetCategoryBreakdownQuery.Input };
  export type Response = GetCategoryBreakdownQuery.Output;
}
