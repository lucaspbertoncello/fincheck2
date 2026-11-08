import type { PauseRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/pause-recurrence.usecase.ts';

export class PauseRecurrenceController {
  private readonly pauseRecurrence: PauseRecurrenceUseCase;

  constructor(pauseRecurrence: PauseRecurrenceUseCase) {
    this.pauseRecurrence = pauseRecurrence;
  }

  async handle(
    request: PauseRecurrenceController.Request,
  ): Promise<PauseRecurrenceController.Response> {
    return this.pauseRecurrence.execute(request.params);
  }
}

export namespace PauseRecurrenceController {
  export type Request = { params: PauseRecurrenceUseCase.Input };
  export type Response = PauseRecurrenceUseCase.Output;
}
