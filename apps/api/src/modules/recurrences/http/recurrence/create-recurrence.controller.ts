import type { CreateRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/create-recurrence.usecase.ts';

export class CreateRecurrenceController {
  private readonly createRecurrence: CreateRecurrenceUseCase;

  constructor(createRecurrence: CreateRecurrenceUseCase) {
    this.createRecurrence = createRecurrence;
  }

  async handle(
    request: CreateRecurrenceController.Request,
  ): Promise<CreateRecurrenceController.Response> {
    return this.createRecurrence.execute(request.body);
  }
}

export namespace CreateRecurrenceController {
  export type Request = { body: CreateRecurrenceUseCase.Input };
  export type Response = CreateRecurrenceUseCase.Output;
}
