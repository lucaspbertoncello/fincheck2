import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { DecideOccurrenceDifferenceUseCase } from '#/modules/recurrences/application/occurrence/decide-occurrence-difference.usecase.ts';

export class DecideOccurrenceDifferenceController {
  private readonly decideOccurrenceDifference: DecideOccurrenceDifferenceUseCase;

  constructor(decideOccurrenceDifference: DecideOccurrenceDifferenceUseCase) {
    this.decideOccurrenceDifference = decideOccurrenceDifference;
  }

  async handle(
    request: DecideOccurrenceDifferenceController.Request,
  ): Promise<DecideOccurrenceDifferenceController.Response> {
    return this.decideOccurrenceDifference.execute({ ...request.params, ...request.body });
  }
}

export namespace DecideOccurrenceDifferenceController {
  export type Request = {
    params: OccurrenceContract.Params;
    body: OccurrenceContract.DecideDifferenceRequest;
  };
  export type Response = DecideOccurrenceDifferenceUseCase.Output;
}
