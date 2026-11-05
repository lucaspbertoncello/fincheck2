import type { IconName } from '#/components/icons/index.ts';

/**
 * One piece of a rule sentence, already written by the caller: plain text, a token in bold
 * ("IFOOD", "Delivery") or an amount (shown by Money, in bold).
 */
export type RulePhraseSegment = string | { strong: string } | { moneyCents: number };

/** Data of a rule row. */
export type RuleRowData = {
  id: string;
  /** Name of the row: where the rule sends to (the category), or what it matches when it only adds tags. */
  name: string;
  /** "Sempre que a descrição contém IFOOD, vai para Delivery com a tag delivery." */
  phrase: readonly RulePhraseSegment[];
  /** Category icon of the rule. */
  icon: IconName;
  appliedCount: number;
  active: boolean;
};

/** What the "…" menu of a rule asks for. */
export type RuleAction = 'edit' | 'view-transactions' | 'apply' | 'delete';
