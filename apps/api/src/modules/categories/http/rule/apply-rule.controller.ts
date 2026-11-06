import type { ApplyRuleUseCase } from '#/modules/categories/application/rule/apply-rule.usecase.ts';

export class ApplyRuleController {
  private readonly applyRule: ApplyRuleUseCase;

  constructor(applyRule: ApplyRuleUseCase) {
    this.applyRule = applyRule;
  }

  async handle(request: ApplyRuleController.Request): Promise<ApplyRuleController.Response> {
    return this.applyRule.execute({ ruleId: request.params.id });
  }
}

export namespace ApplyRuleController {
  export type Request = { params: { id: string } };
  export type Response = ApplyRuleUseCase.Output;
}
