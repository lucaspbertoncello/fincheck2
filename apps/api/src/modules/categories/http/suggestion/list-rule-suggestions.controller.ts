import type { ListRuleSuggestionsQuery } from '#/modules/categories/application/suggestion/list-rule-suggestions.query.ts';

export class ListRuleSuggestionsController {
  private readonly listRuleSuggestions: ListRuleSuggestionsQuery;

  constructor(listRuleSuggestions: ListRuleSuggestionsQuery) {
    this.listRuleSuggestions = listRuleSuggestions;
  }

  async handle(
    request: ListRuleSuggestionsController.Request,
  ): Promise<ListRuleSuggestionsController.Response> {
    return this.listRuleSuggestions.execute(request.query);
  }
}

export namespace ListRuleSuggestionsController {
  export type Request = { query: ListRuleSuggestionsQuery.Input };
  export type Response = ListRuleSuggestionsQuery.Output;
}
