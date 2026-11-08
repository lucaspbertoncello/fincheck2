export type RulePreviewMatch = {
  id: string;
  description: string;
  /** Already written: "18/10". */
  dateLabel: string;
  cents: number;
  /** Flow of the transaction: money turns red (expense) or green (income), with its sign. */
  tone?: 'income' | 'expense';
};

export type RulePreviewData = {
  /** "Bate com 14 transações do histórico". */
  title: string;
  matches: readonly RulePreviewMatch[];
  /** How many more match beyond the ones listed. */
  moreCount?: number;
};
