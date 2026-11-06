import type { PreviewRuleQuery } from '#/modules/categories/application/rule/preview-rule.query.ts';

export class PreviewRuleController {
  private readonly previewRule: PreviewRuleQuery;

  constructor(previewRule: PreviewRuleQuery) {
    this.previewRule = previewRule;
  }

  async handle(request: PreviewRuleController.Request): Promise<PreviewRuleController.Response> {
    return this.previewRule.execute(request.body);
  }
}

export namespace PreviewRuleController {
  export type Request = { body: PreviewRuleQuery.Input };
  export type Response = PreviewRuleQuery.Output;
}
