import type { UnsettleOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/unsettle-occurrence.usecase.ts';

export class UnsettleOccurrenceController {
  private readonly unsettleOccurrence: UnsettleOccurrenceUseCase;

  constructor(unsettleOccurrence: UnsettleOccurrenceUseCase) {
    this.unsettleOccurrence = unsettleOccurrence;
  }

  async handle(
    request: UnsettleOccurrenceController.Request,
  ): Promise<UnsettleOccurrenceController.Response> {
    return this.unsettleOccurrence.execute(request.params);
  }
}

export namespace UnsettleOccurrenceController {
  export type Request = { params: UnsettleOccurrenceUseCase.Input };
  export type Response = UnsettleOccurrenceUseCase.Output;
}
