import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { UpdateOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/update-occurrence.usecase.ts';

export class UpdateOccurrenceController {
  private readonly updateOccurrence: UpdateOccurrenceUseCase;

  constructor(updateOccurrence: UpdateOccurrenceUseCase) {
    this.updateOccurrence = updateOccurrence;
  }

  async handle(
    request: UpdateOccurrenceController.Request,
  ): Promise<UpdateOccurrenceController.Response> {
    return this.updateOccurrence.execute({ ...request.params, ...request.body });
  }
}

export namespace UpdateOccurrenceController {
  export type Request = {
    params: OccurrenceContract.Params;
    body: OccurrenceContract.UpdateRequest;
  };
  export type Response = UpdateOccurrenceUseCase.Output;
}
