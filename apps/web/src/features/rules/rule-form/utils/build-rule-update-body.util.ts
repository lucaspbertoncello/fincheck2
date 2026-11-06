import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import type { RuleTextMode } from '#/features/rules/types/rule-form.type.ts';

type EditedValues = {
  mode: RuleTextMode;
  description: string;
  counterparty: string;
  accountId: string | null;
  categoryId: string | null;
  tagIds: readonly string[];
};

function sameSet(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((id) => second.includes(id));
}

/** Only what changed, since `PATCH /rules/:id` takes the fields that are sent and nothing more. */
export function buildRuleUpdateBody(rule: Rule.Dto, values: EditedValues): Rule.UpdateRequest {
  const body: Rule.UpdateRequest = {};
  // A condition the modal no longer uses goes out as null, which clears it.
  const description = values.mode === 'counterparty' ? null : normalizeText(values.description);
  const counterparty = values.mode === 'description' ? null : normalizeText(values.counterparty);

  if (description !== rule.descriptionContains) body.descriptionContains = description;
  if (counterparty !== rule.counterpartyContains) body.counterpartyContains = counterparty;
  if (values.accountId !== rule.accountId) body.accountId = values.accountId;
  if (values.categoryId !== rule.categoryId) body.categoryId = values.categoryId;
  if (!sameSet(values.tagIds, rule.tagIds)) body.tagIds = [...values.tagIds];

  return body;
}
