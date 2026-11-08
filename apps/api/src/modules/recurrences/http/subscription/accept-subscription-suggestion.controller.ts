import type { AcceptSubscriptionSuggestionUseCase } from '#/modules/recurrences/application/subscription/accept-subscription-suggestion.usecase.ts';

export class AcceptSubscriptionSuggestionController {
  private readonly acceptSubscriptionSuggestion: AcceptSubscriptionSuggestionUseCase;

  constructor(acceptSubscriptionSuggestion: AcceptSubscriptionSuggestionUseCase) {
    this.acceptSubscriptionSuggestion = acceptSubscriptionSuggestion;
  }

  async handle(
    request: AcceptSubscriptionSuggestionController.Request,
  ): Promise<AcceptSubscriptionSuggestionController.Response> {
    return this.acceptSubscriptionSuggestion.execute(request.body);
  }
}

export namespace AcceptSubscriptionSuggestionController {
  export type Request = { body: AcceptSubscriptionSuggestionUseCase.Input };
  export type Response = AcceptSubscriptionSuggestionUseCase.Output;
}
