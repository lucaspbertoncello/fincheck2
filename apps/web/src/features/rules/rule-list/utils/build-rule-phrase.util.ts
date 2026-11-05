import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { RulePhraseSegment } from '@fincheck/ui';

import { titleCaseName } from '#/features/rules/rule-list/utils/title-case-name.util.ts';
import { buildNameSegments } from '#/features/rules/rule-list/utils/build-name-segments.util.ts';

function buildConditionSegments(rule: Rule.Dto): RulePhraseSegment[] {
  const segments: RulePhraseSegment[] = [];

  if (rule.kind) segments.push(rule.kind === 'expense' ? ', em despesas' : ', em receitas');
  if (rule.accountId) segments.push(', numa conta específica');

  const { amountMinCents: min, amountMaxCents: max } = rule;
  if (min !== null && max !== null)
    segments.push(', de ', { moneyCents: min }, ' a ', { moneyCents: max });
  else if (min !== null) segments.push(', a partir de ', { moneyCents: min });
  else if (max !== null) segments.push(', até ', { moneyCents: max });

  return segments;
}

/**
 * The sentence of a rule: "Sempre que a descrição contém IFOOD, vai para Delivery com a tag
 * delivery." or "Sempre que o Pix for de Treetools, vai para Salário."; with both text conditions
 * both are in it. The contract has no sentence; the names come from the category and tag lists.
 */
export function buildRulePhrase(
  rule: Rule.Dto,
  categories: readonly Category.Dto[],
  tags: readonly Tag.Dto[],
): RulePhraseSegment[] {
  const category = categories.find((item) => item.id === rule.categoryId);
  const tagNames = rule.tagIds
    .map((id) => tags.find((tag) => tag.id === id)?.name)
    .filter((name): name is string => name !== undefined);

  const segments: RulePhraseSegment[] = ['Sempre que '];
  if (rule.descriptionContains !== null) {
    segments.push('a descrição contém ', { strong: rule.descriptionContains });
  }
  if (rule.counterpartyContains !== null) {
    segments.push(rule.descriptionContains !== null ? ' e o Pix for de ' : 'o Pix for de ', {
      strong: titleCaseName(rule.counterpartyContains),
    });
  }
  segments.push(...buildConditionSegments(rule));

  if (rule.categoryId) {
    segments.push(', vai para ', { strong: category?.name ?? 'uma categoria' });
  }
  if (tagNames.length > 0) {
    const lead = rule.categoryId ? ' com ' : ', adiciona ';
    segments.push(lead + (tagNames.length === 1 ? 'a tag ' : 'as tags '));
    segments.push(...buildNameSegments(tagNames));
  }
  segments.push('.');

  return segments;
}
