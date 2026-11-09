import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';

/** What the history rule changed when it was created, the payload that undoes it. */
type RuleHistoryPrevious = NonNullable<Rule.CreateResult['applied']>['previous'];

/** A transaction saved in this visit: what "Voltar à anterior" reopens and "Desfazer" reverts. */
export type ReviewedEntry = {
  item: ReviewQueue.ItemDto;
  categoryId: string;
  /** The tags marked, all of the category. */
  tagIds: string[];
  /** The rule this save created, when there was one. */
  ruleId: string | null;
  historyPrevious: RuleHistoryPrevious;
};

/** What the person typed on the card for the transaction on screen. */
export type ReviewDraft = {
  transactionId: string;
  categoryId: string | null;
  tagIds: string[];
  ruleEnabled: boolean;
};
