import type { OccurrenceEnsurer } from '#/modules/dashboard/application/occurrence/occurrence-ensurer.interface.ts';
import type { GetTimelineQuery } from '#/modules/dashboard/application/timeline/get-timeline.query.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class GetTimelineController {
  private readonly ensureOccurrences: OccurrenceEnsurer;
  private readonly getTimeline: GetTimelineQuery;

  constructor(ensureOccurrences: OccurrenceEnsurer, getTimeline: GetTimelineQuery) {
    this.ensureOccurrences = ensureOccurrences;
    this.getTimeline = getTimeline;
  }

  async handle(request: GetTimelineController.Request): Promise<GetTimelineController.Response> {
    await this.ensureOccurrences.execute();

    return this.getTimeline.execute(request.query);
  }
}

export namespace GetTimelineController {
  export type Request = { query: GetTimelineQuery.Input };
  export type Response = GetTimelineQuery.Output;
}
