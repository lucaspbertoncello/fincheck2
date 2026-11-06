import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { buildHistoryDefinition } from '#/modules/categories/application/rule/build-history-definition.util.ts';
import { findOlderRuleIds } from '#/modules/categories/application/rule/find-older-rule-ids.util.ts';
import type { RuleHistoryPreviewer } from '#/modules/categories/application/rule/rule-history-previewer.interface.ts';
import type { RuleReferenceResolver } from '#/modules/categories/application/rule/rule-reference-resolver.service.ts';
import { RuleCategoryKindMismatchError } from '#/modules/categories/domain/rule/rule-category-kind-mismatch.error.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';

// "Bate com 14 transações do histórico" (RF-CAT-004, RF-CAT-006): what a rule would match and
// change, with three examples. The rule need not be complete (no action: the changes equal the
// matches) nor saved. Writes nothing; an archived category is allowed here.
export class PreviewRuleQuery {
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly references: RuleReferenceResolver;
  private readonly history: RuleHistoryPreviewer;

  constructor(
    rules: CategoryRuleRepository<Kysely<Database>>,
    references: RuleReferenceResolver,
    history: RuleHistoryPreviewer,
  ) {
    this.rules = rules;
    this.references = references;
    this.history = history;
  }

  async execute(input: PreviewRuleQuery.Input): Promise<PreviewRuleQuery.Output> {
    const kind = input.kind ?? null;
    await this.references.account(input.accountId ?? null);
    const category = await this.references.category(input.categoryId ?? null);
    const tagIds = [...new Set(input.tagIds ?? [])];
    await this.references.tagsOf(tagIds);
    if (kind !== null && category !== null && kind !== category.kind) {
      throw new RuleCategoryKindMismatchError();
    }

    const [preview] = await this.history.preview([
      buildHistoryDefinition({
        condition: {
          descriptionContains: input.descriptionContains ?? null,
          counterpartyContains: input.counterpartyContains ?? null,
          kind,
          accountId: input.accountId ?? null,
          amountMinCents: input.amountMinCents ?? null,
          amountMaxCents: input.amountMaxCents ?? null,
        },
        category,
        tagIds,
        olderRuleIds: findOlderRuleIds(await this.rules.list(), null),
      }),
    ]);
    if (preview === undefined) throw new RangeError('The history answered no preview');

    return preview;
  }
}

export namespace PreviewRuleQuery {
  export type Input = Rule.PreviewRequest;
  export type Output = Rule.Preview;
}
