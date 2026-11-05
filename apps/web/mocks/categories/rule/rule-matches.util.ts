import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';

interface RuleCondition {
  descriptionContains?: string | null | undefined;
  counterpartyContains?: string | null | undefined;
  kind?: 'expense' | 'income' | null | undefined;
  accountId?: string | null | undefined;
  amountMinCents?: number | null | undefined;
  amountMaxCents?: number | null | undefined;
}

// Same matching everywhere (import, preview, history): the pattern appears in the description in
// use or in the bank's; the sender appears in the bank's counterparty (no sender, no match); with
// both text conditions both must hold. Then the optional conditions.
export function ruleMatches(rule: RuleCondition, tx: MockState.TransactionRecord): boolean {
  if (tx.nature !== 'expense' && tx.nature !== 'income') return false;
  if (rule.descriptionContains) {
    const pattern = normalizeText(rule.descriptionContains);
    const inUse = normalizeText(tx.description).includes(pattern);
    const inBank = tx.bank ? normalizeText(tx.bank.description).includes(pattern) : false;
    if (!inUse && !inBank) return false;
  }
  if (rule.counterpartyContains) {
    const sender = tx.bank?.counterparty;
    if (!sender || !normalizeText(sender).includes(normalizeText(rule.counterpartyContains)))
      return false;
  }
  if (rule.kind && rule.kind !== tx.nature) return false;
  if (rule.accountId && rule.accountId !== tx.accountId) return false;
  const amount = Math.abs(tx.amountCents);
  if (rule.amountMinCents != null && amount < rule.amountMinCents) return false;
  if (rule.amountMaxCents != null && amount > rule.amountMaxCents) return false;

  return true;
}
