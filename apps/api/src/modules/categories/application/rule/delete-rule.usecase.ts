import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';
import { RuleNotFoundError } from '#/modules/categories/domain/rule/rule-not-found.error.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Excluir" (RF-CAT-004): the rule goes, the categories and tags it put stay on the transactions.
export class DeleteRuleUseCase {
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;

  constructor(
    rules: CategoryRuleRepository<Kysely<Database>>,
    unitOfWork: UnitOfWork<Kysely<Database>>,
  ) {
    this.rules = rules;
    this.unitOfWork = unitOfWork;
  }

  async execute(input: DeleteRuleUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const rule = await this.rules.findById(input.ruleId, executor);
      if (!rule) throw new RuleNotFoundError();

      await this.rules.delete(rule.id, executor);
    });
  }
}

export namespace DeleteRuleUseCase {
  export type Input = { ruleId: string };
}
