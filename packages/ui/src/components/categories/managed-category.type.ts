import type { IconName } from '#/components/icons/icon-markup.constant.ts';

/** A category as the management list shows it (no amounts: this screen never shows money). */
export type ManagedCategory = {
  id: string;
  name: string;
  icon: IconName;
  transactionCount: number;
  ruleCount: number;
  /** Ready text ("3 out.", "28 ago., há 2 meses", "ontem"); the screen formats the date. */
  lastUsedLabel: string;
  archived?: boolean;
  /** Archived only: "Despesa · 27 transações · usada até maio". */
  archivedNote?: string;
};
