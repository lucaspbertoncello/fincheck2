import type { ListRulesQuery } from '#/modules/categories/application/rule/list-rules.query.ts';

export class ListRulesController {
  private readonly listRules: ListRulesQuery;

  constructor(listRules: ListRulesQuery) {
    this.listRules = listRules;
  }

  async handle(): Promise<ListRulesController.Response> {
    return this.listRules.execute();
  }
}

export namespace ListRulesController {
  export type Response = ListRulesQuery.Output;
}
