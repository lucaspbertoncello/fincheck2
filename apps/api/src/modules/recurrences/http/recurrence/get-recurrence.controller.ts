import type { GetRecurrenceQuery } from '#/modules/recurrences/application/recurrence/get-recurrence.query.ts';

export class GetRecurrenceController {
  private readonly getRecurrence: GetRecurrenceQuery;

  constructor(getRecurrence: GetRecurrenceQuery) {
    this.getRecurrence = getRecurrence;
  }

  async handle(
    request: GetRecurrenceController.Request,
  ): Promise<GetRecurrenceController.Response> {
    return this.getRecurrence.execute(request.params);
  }
}

export namespace GetRecurrenceController {
  export type Request = { params: GetRecurrenceQuery.Input };
  export type Response = GetRecurrenceQuery.Output;
}
