import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type { UpdateRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/update-recurrence.usecase.ts';

export class UpdateRecurrenceController {
  private readonly updateRecurrence: UpdateRecurrenceUseCase;

  constructor(updateRecurrence: UpdateRecurrenceUseCase) {
    this.updateRecurrence = updateRecurrence;
  }

  async handle(
    request: UpdateRecurrenceController.Request,
  ): Promise<UpdateRecurrenceController.Response> {
    return this.updateRecurrence.execute({ ...request.params, ...request.body });
  }
}

export namespace UpdateRecurrenceController {
  export type Request = {
    params: RecurrenceContract.Params;
    body: RecurrenceContract.UpdateRequest;
  };
  export type Response = UpdateRecurrenceUseCase.Output;
}
