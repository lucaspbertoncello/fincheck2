import type { DeleteRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/delete-recurrence.usecase.ts';

export class DeleteRecurrenceController {
  private readonly deleteRecurrence: DeleteRecurrenceUseCase;

  constructor(deleteRecurrence: DeleteRecurrenceUseCase) {
    this.deleteRecurrence = deleteRecurrence;
  }

  async handle(request: DeleteRecurrenceController.Request): Promise<void> {
    await this.deleteRecurrence.execute(request.params);
  }
}

export namespace DeleteRecurrenceController {
  export type Request = { params: DeleteRecurrenceUseCase.Input };
}
