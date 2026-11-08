import type { UnskipOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/unskip-occurrence.usecase.ts';

export class UnskipOccurrenceController {
  private readonly unskipOccurrence: UnskipOccurrenceUseCase;

  constructor(unskipOccurrence: UnskipOccurrenceUseCase) {
    this.unskipOccurrence = unskipOccurrence;
  }

  async handle(
    request: UnskipOccurrenceController.Request,
  ): Promise<UnskipOccurrenceController.Response> {
    return this.unskipOccurrence.execute(request.params);
  }
}

export namespace UnskipOccurrenceController {
  export type Request = { params: UnskipOccurrenceUseCase.Input };
  export type Response = UnskipOccurrenceUseCase.Output;
}
