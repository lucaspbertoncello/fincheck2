import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useAcceptRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-accept-rule-suggestion.hook.ts';
import { useDismissRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-dismiss-rule-suggestion.hook.ts';
import { useRuleSuggestions } from '#/domain/categories/rule-suggestion/hooks/use-rule-suggestions.hook.ts';
import { useCreateRule } from '#/domain/categories/rule/hooks/use-create-rule.hook.ts';
import { useDeleteRule } from '#/domain/categories/rule/hooks/use-delete-rule.hook.ts';
import { usePreviewRule } from '#/domain/categories/rule/hooks/use-preview-rule.hook.ts';
import { useCreateTag } from '#/domain/categories/tag/hooks/use-create-tag.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';
import { useLinkOccurrencePayment } from '#/domain/recurrences/occurrence/hooks/use-link-occurrence-payment.hook.ts';
import { useUnlinkOccurrencePayment } from '#/domain/recurrences/occurrence/hooks/use-unlink-occurrence-payment.hook.ts';
import { useReviewQueue } from '#/domain/transactions/review-queue/hooks/use-review-queue.hook.ts';
import { useRestoreBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-restore-bulk-transactions.hook.ts';
import { useUpdateTransaction } from '#/domain/transactions/transaction/hooks/use-update-transaction.hook.ts';

/** The reads and writes of the screen that do not depend on what is on the card. */
export function useReviewQueueModel(month: string) {
  return {
    queue: useReviewQueue({ month }),
    categories: useCategories({ status: 'active' }),
    tags: useTags(),
    accounts: useAccounts(),
    updateTransaction: useUpdateTransaction(),
    createTag: useCreateTag(),
    createRule: useCreateRule(),
    deleteRule: useDeleteRule(),
    restoreBulk: useRestoreBulkTransactions(),
    linkPayment: useLinkOccurrencePayment(),
    unlinkPayment: useUnlinkOccurrencePayment(),
    acceptSuggestion: useAcceptRuleSuggestion(),
    dismissSuggestion: useDismissRuleSuggestion(),
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
