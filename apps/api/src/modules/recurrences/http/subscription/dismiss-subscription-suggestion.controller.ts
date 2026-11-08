import type { DismissSubscriptionSuggestionUseCase } from '#/modules/recurrences/application/subscription/dismiss-subscription-suggestion.usecase.ts';

export class DismissSubscriptionSuggestionController {
  private readonly dismissSubscriptionSuggestion: DismissSubscriptionSuggestionUseCase;

  constructor(dismissSubscriptionSuggestion: DismissSubscriptionSuggestionUseCase) {
    this.dismissSubscriptionSuggestion = dismissSubscriptionSuggestion;
  }

  async handle(request: DismissSubscriptionSuggestionController.Request): Promise<void> {
    await this.dismissSubscriptionSuggestion.execute(request.body);
  }
}

export namespace DismissSubscriptionSuggestionController {
  export type Request = { body: DismissSubscriptionSuggestionUseCase.Input };
}
