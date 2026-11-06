import type { AcceptRuleSuggestionUseCase } from '#/modules/categories/application/suggestion/accept-rule-suggestion.usecase.ts';

export class AcceptRuleSuggestionController {
  private readonly acceptRuleSuggestion: AcceptRuleSuggestionUseCase;

  constructor(acceptRuleSuggestion: AcceptRuleSuggestionUseCase) {
    this.acceptRuleSuggestion = acceptRuleSuggestion;
  }

  async handle(
    request: AcceptRuleSuggestionController.Request,
  ): Promise<AcceptRuleSuggestionController.Response> {
    return this.acceptRuleSuggestion.execute(request.body);
  }
}

export namespace AcceptRuleSuggestionController {
  export type Request = { body: AcceptRuleSuggestionUseCase.Input };
  export type Response = AcceptRuleSuggestionUseCase.Output;
}
