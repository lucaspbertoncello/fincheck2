import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import type { RuleTextMode } from '#/features/rules/types/rule-form.type.ts';

/** The text conditions a saved rule has; a rule always has at least one. */
export function getRuleTextMode(rule: Rule.Dto): RuleTextMode {
  if (rule.descriptionContains !== null && rule.counterpartyContains !== null) return 'both';
  return rule.counterpartyContains !== null ? 'counterparty' : 'description';
}
