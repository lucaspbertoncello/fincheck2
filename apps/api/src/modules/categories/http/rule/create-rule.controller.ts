import type { CreateRuleUseCase } from '#/modules/categories/application/rule/create-rule.usecase.ts';

export class CreateRuleController {
  private readonly createRule: CreateRuleUseCase;

  constructor(createRule: CreateRuleUseCase) {
    this.createRule = createRule;
  }

  async handle(request: CreateRuleController.Request): Promise<CreateRuleController.Response> {
    return this.createRule.execute(request.body);
  }
}

export namespace CreateRuleController {
  export type Request = { body: CreateRuleUseCase.Input };
  export type Response = CreateRuleUseCase.Output;
}
