import type { SkipOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/skip-occurrence.usecase.ts';

export class SkipOccurrenceController {
  private readonly skipOccurrence: SkipOccurrenceUseCase;

  constructor(skipOccurrence: SkipOccurrenceUseCase) {
    this.skipOccurrence = skipOccurrence;
  }

  async handle(
    request: SkipOccurrenceController.Request,
  ): Promise<SkipOccurrenceController.Response> {
    return this.skipOccurrence.execute(request.params);
  }
}

export namespace SkipOccurrenceController {
  export type Request = { params: SkipOccurrenceUseCase.Input };
  export type Response = SkipOccurrenceUseCase.Output;
}
