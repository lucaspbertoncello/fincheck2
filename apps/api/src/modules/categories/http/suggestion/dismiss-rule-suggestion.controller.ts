import type { DismissRuleSuggestionUseCase } from '#/modules/categories/application/suggestion/dismiss-rule-suggestion.usecase.ts';

export class DismissRuleSuggestionController {
  private readonly dismissRuleSuggestion: DismissRuleSuggestionUseCase;

  constructor(dismissRuleSuggestion: DismissRuleSuggestionUseCase) {
    this.dismissRuleSuggestion = dismissRuleSuggestion;
  }

  async handle(
    request: DismissRuleSuggestionController.Request,
  ): Promise<DismissRuleSuggestionController.Response> {
    return this.dismissRuleSuggestion.execute(request.body);
  }
}

export namespace DismissRuleSuggestionController {
  export type Request = { body: DismissRuleSuggestionUseCase.Input };
  export type Response = void;
}
