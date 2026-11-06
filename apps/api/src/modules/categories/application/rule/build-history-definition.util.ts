import type { RuleHistoryPreviewer } from '#/modules/categories/application/rule/rule-history-previewer.interface.ts';
import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';
import { matchesRuleCondition } from '#/modules/categories/domain/rule/matches-rule-condition.util.ts';

// A rule as the history port sees it: what it does (category and tags) and the matching to run.
export function buildHistoryDefinition(input: {
  condition: CategoryRule.Condition;
  category: CategoryRule.CategoryRef | null;
  tagIds: string[];
  olderRuleIds: ReadonlySet<string>;
}): RuleHistoryPreviewer.Definition {
  return {
    categoryId: input.category?.id ?? null,
    categoryKind: input.category?.kind ?? null,
    tagIds: input.tagIds,
    olderRuleIds: input.olderRuleIds,
    matches: (candidate) => matchesRuleCondition(input.condition, candidate),
  };
}
