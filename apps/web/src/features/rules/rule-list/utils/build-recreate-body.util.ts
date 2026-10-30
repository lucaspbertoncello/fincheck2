import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

/** The create body that brings a deleted rule back with the same conditions and actions. */
export function buildRecreateBody(rule: Rule.Dto): Rule.CreateRequest {
  const body: Rule.CreateRequest = { descriptionContains: rule.descriptionContains };

  if (rule.kind) body.kind = rule.kind;
  if (rule.accountId) body.accountId = rule.accountId;
  if (rule.amountMinCents !== null) body.amountMinCents = rule.amountMinCents;
  if (rule.amountMaxCents !== null) body.amountMaxCents = rule.amountMaxCents;
  if (rule.categoryId) body.categoryId = rule.categoryId;
  if (rule.tagIds.length > 0) body.tagIds = [...rule.tagIds];

  return body;
}
