import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';

// The one matching of a rule against a transaction (BR-CAT-004), the same on the import, in the
// preview and over the history. Pure: no database, no clock.
//
// - Only an expense or an income can match.
// - `descriptionContains` appears in the description in use or in the bank's; `counterpartyContains`
//   appears in the sender or receiver the bank sent (no sender, no match). With both, both hold.
//   The texts are compared normalized (upper case, no accents, single spaces).
// - Then the optional conditions: the kind, the account and the absolute amount between the minimum
//   and the maximum.
export function matchesRuleCondition(
  condition: CategoryRule.Condition,
  candidate: CategoryRule.Candidate,
): boolean {
  if (condition.descriptionContains !== null) {
    const pattern = normalizeText(condition.descriptionContains);
    const inUse = normalizeText(candidate.description).includes(pattern);
    const inBank =
      candidate.bankDescription !== null &&
      normalizeText(candidate.bankDescription).includes(pattern);
    if (!inUse && !inBank) return false;
  }

  if (condition.counterpartyContains !== null) {
    if (candidate.counterparty === null) return false;
    if (
      !normalizeText(candidate.counterparty).includes(normalizeText(condition.counterpartyContains))
    ) {
      return false;
    }
  }

  if (condition.kind !== null && condition.kind !== candidate.nature) return false;
  if (condition.accountId !== null && condition.accountId !== candidate.accountId) return false;

  const amount = Math.abs(candidate.amountCents);
  if (condition.amountMinCents !== null && amount < condition.amountMinCents) return false;
  if (condition.amountMaxCents !== null && amount > condition.amountMaxCents) return false;

  return true;
}
