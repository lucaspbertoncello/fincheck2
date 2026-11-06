import type { UpdateRuleUseCase } from '#/modules/categories/application/rule/update-rule.usecase.ts';

export class UpdateRuleController {
  private readonly updateRule: UpdateRuleUseCase;

  constructor(updateRule: UpdateRuleUseCase) {
    this.updateRule = updateRule;
  }

  async handle(request: UpdateRuleController.Request): Promise<UpdateRuleController.Response> {
    return this.updateRule.execute({ ruleId: request.params.id, body: request.body });
  }
}

export namespace UpdateRuleController {
  export type Request = { params: { id: string }; body: UpdateRuleUseCase.Input['body'] };
  export type Response = UpdateRuleUseCase.Output;
}
