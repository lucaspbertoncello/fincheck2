import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

type EditedValues = {
  description: string;
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
  const description = normalizeText(values.description);

  if (description !== rule.descriptionContains) body.descriptionContains = description;
  if (values.accountId !== rule.accountId) body.accountId = values.accountId;
  if (values.categoryId !== rule.categoryId) body.categoryId = values.categoryId;
  if (!sameSet(values.tagIds, rule.tagIds)) body.tagIds = [...values.tagIds];

  return body;
}
