import type { SettleOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/settle-occurrence.usecase.ts';

export class SettleOccurrenceController {
  private readonly settleOccurrence: SettleOccurrenceUseCase;

  constructor(settleOccurrence: SettleOccurrenceUseCase) {
    this.settleOccurrence = settleOccurrence;
  }

  async handle(
    request: SettleOccurrenceController.Request,
  ): Promise<SettleOccurrenceController.Response> {
    return this.settleOccurrence.execute(request.params);
  }
}

export namespace SettleOccurrenceController {
  export type Request = { params: SettleOccurrenceUseCase.Input };
  export type Response = SettleOccurrenceUseCase.Output;
}
