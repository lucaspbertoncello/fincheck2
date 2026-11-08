import type { PreviewRecurrenceQuery } from '#/modules/recurrences/application/recurrence/preview-recurrence.query.ts';

export class PreviewRecurrenceController {
  private readonly previewRecurrence: PreviewRecurrenceQuery;

  constructor(previewRecurrence: PreviewRecurrenceQuery) {
    this.previewRecurrence = previewRecurrence;
  }

  handle(request: PreviewRecurrenceController.Request): PreviewRecurrenceController.Response {
    return this.previewRecurrence.execute(request.body);
  }
}

export namespace PreviewRecurrenceController {
  export type Request = { body: PreviewRecurrenceQuery.Input };
  export type Response = PreviewRecurrenceQuery.Output;
}
