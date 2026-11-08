import type { ResumeRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/resume-recurrence.usecase.ts';

export class ResumeRecurrenceController {
  private readonly resumeRecurrence: ResumeRecurrenceUseCase;

  constructor(resumeRecurrence: ResumeRecurrenceUseCase) {
    this.resumeRecurrence = resumeRecurrence;
  }

  async handle(
    request: ResumeRecurrenceController.Request,
  ): Promise<ResumeRecurrenceController.Response> {
    return this.resumeRecurrence.execute(request.params);
  }
}

export namespace ResumeRecurrenceController {
  export type Request = { params: ResumeRecurrenceUseCase.Input };
  export type Response = ResumeRecurrenceUseCase.Output;
}
