import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useRuleSuggestions } from '#/domain/categories/rule-suggestion/hooks/use-rule-suggestions.hook.ts';
import { usePreviewRule } from '#/domain/categories/rule/hooks/use-preview-rule.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';
import { useReviewQueue } from '#/domain/transactions/review-queue/hooks/use-review-queue.hook.ts';

/** The reads and writes of the screen that do not depend on what is on the card. */
export function useReviewQueueModel(month: string) {
  return {
    queue: useReviewQueue({ month }),
    categories: useCategories({ status: 'active' }),
    tags: useTags(),
    accounts: useAccounts(),
  };
}

type ReviewRuleModelInput = {
  /** What the rule line of the card asks the preview; null while there is nothing to ask. */
  rulePreview: { pattern: string; kind: Category.Dto['kind']; categoryId: string } | null;
  /** Ids saved in this visit: the rule suggestions that may have come from them. */
  reviewedIds: readonly string[];
};

/** The reads that follow what is on the card and what was saved. */
export function useReviewRuleModel({ rulePreview, reviewedIds }: ReviewRuleModelInput) {
  return {
    preview: usePreviewRule(
      {
        descriptionContains: rulePreview?.pattern ?? '',
        kind: rulePreview?.kind,
        categoryId: rulePreview?.categoryId,
      },
      { enabled: rulePreview !== null },
    ),
    suggestions: useRuleSuggestions(reviewedIds),
  };
}
