import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { RuleRowData } from '@fincheck/ui';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { titleCaseName } from '#/features/rules/rule-list/utils/title-case-name.util.ts';
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
    name:
      category?.name ??
      rule.descriptionContains ??
      (rule.counterpartyContains ? titleCaseName(rule.counterpartyContains) : 'Regra'),
    phrase: buildRulePhrase(rule, categories, tags),
    icon: category ? mapCategoryIcon(category.icon) : 'tag',
    appliedCount: rule.appliedCount,
    active: enabled,
  };
}
