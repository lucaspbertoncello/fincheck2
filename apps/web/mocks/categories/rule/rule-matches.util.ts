import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';

interface RuleCondition {
  descriptionContains: string;
  kind?: 'expense' | 'income' | null | undefined;
  accountId?: string | null | undefined;
  amountMinCents?: number | null | undefined;
  amountMaxCents?: number | null | undefined;
}

// Same matching everywhere (import, preview, history): the pattern appears in the description in
// use or in the bank's, then the optional conditions. The sender does not take part.
export function ruleMatches(rule: RuleCondition, tx: MockState.TransactionRecord): boolean {
  if (tx.nature !== 'expense' && tx.nature !== 'income') return false;
  const pattern = normalizeText(rule.descriptionContains);
  const inUse = normalizeText(tx.description).includes(pattern);
  const inBank = tx.bank ? normalizeText(tx.bank.description).includes(pattern) : false;
  if (!inUse && !inBank) return false;
  if (rule.kind && rule.kind !== tx.nature) return false;
  if (rule.accountId && rule.accountId !== tx.accountId) return false;
  const amount = Math.abs(tx.amountCents);
  if (rule.amountMinCents != null && amount < rule.amountMinCents) return false;
  if (rule.amountMaxCents != null && amount > rule.amountMaxCents) return false;

  return true;
}
