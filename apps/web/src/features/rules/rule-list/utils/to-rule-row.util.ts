import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { RuleRowData } from '@fincheck/ui';

import { toUiIcon } from '#/features/categories/utils/to-ui-icon.util.ts';
import { buildRulePhrase } from '#/features/rules/rule-list/utils/build-rule-phrase.util.ts';

/** A rule of the contract as a row of the list; `enabled` can be overridden while a switch is saving. */
export function toRuleRow(
  rule: Rule.Dto,
  categories: readonly Category.Dto[],
  tags: readonly Tag.Dto[],
  enabled: boolean = rule.enabled,
): RuleRowData {
  const category = categories.find((item) => item.id === rule.categoryId);

  return {
    id: rule.id,
    phrase: buildRulePhrase(rule, categories, tags),
    icon: category ? toUiIcon(category.icon) : 'tag',
    appliedCount: rule.appliedCount,
    active: enabled,
  };
}
