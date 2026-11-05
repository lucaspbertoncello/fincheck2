import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

/** The preview body with the conditions and actions of a saved rule: what applying it would catch. */
export function buildRulePreviewBody(rule: Rule.Dto): Rule.PreviewRequest {
  const body: Rule.PreviewRequest = {};

  if (rule.descriptionContains !== null) body.descriptionContains = rule.descriptionContains;
  if (rule.counterpartyContains !== null) body.counterpartyContains = rule.counterpartyContains;
  if (rule.kind) body.kind = rule.kind;
  if (rule.accountId) body.accountId = rule.accountId;
  if (rule.amountMinCents !== null) body.amountMinCents = rule.amountMinCents;
  if (rule.amountMaxCents !== null) body.amountMaxCents = rule.amountMaxCents;
  if (rule.categoryId) body.categoryId = rule.categoryId;
  if (rule.tagIds.length > 0) body.tagIds = [...rule.tagIds];

  return body;
}
