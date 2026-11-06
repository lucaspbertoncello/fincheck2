import type { DeleteRuleUseCase } from '#/modules/categories/application/rule/delete-rule.usecase.ts';

export class DeleteRuleController {
  private readonly deleteRule: DeleteRuleUseCase;

  constructor(deleteRule: DeleteRuleUseCase) {
    this.deleteRule = deleteRule;
  }

  async handle(request: DeleteRuleController.Request): Promise<DeleteRuleController.Response> {
    return this.deleteRule.execute({ ruleId: request.params.id });
  }
}

export namespace DeleteRuleController {
  export type Request = { params: { id: string } };
  export type Response = void;
}
