import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import { useCreateRule } from '#/domain/categories/rule/hooks/use-create-rule.hook.ts';
import { useUpdateTransaction } from '#/domain/transactions/transaction/hooks/use-update-transaction.hook.ts';
import type { ReviewedEntry } from '#/features/review/review-queue/review-queue.type.ts';
import { hasApiErrorCode } from '#/shared/api/api.error.ts';
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';

type SaveReviewEntryInput = {
  onError: (message: string) => void;
};

type SaveEntryParams = {
  item: ReviewedEntry['item'];
  categoryId: string;
  /** The tags marked on the card: all of them belong to `categoryId`. */
  tagIds: string[];
  /** The rule to create with the save; null when none was asked. */
  rule: { pattern: string; kind: Category.Dto['kind'] } | null;
};

/**
 * Saves the category and tags of an entry and, when asked, the rule that goes with it.
 * Returns the saved entry, or null when the transaction itself could not be saved.
 */
export function useSaveReviewEntry({ onError }: SaveReviewEntryInput) {
  const updateTransaction = useUpdateTransaction();
  const createRule = useCreateRule();

  return async function saveEntry({
    item,
    categoryId,
    tagIds,
    rule,
  }: SaveEntryParams): Promise<ReviewedEntry | null> {
    try {
      await updateTransaction.mutateAsync({
        id: item.transaction.id,
        body: { categoryId, tagIds },
      });
    } catch (error) {
      onError(getApiErrorMessage(error, 'Não deu para salvar. Tente de novo.'));
      return null;
    }

    let entry: ReviewedEntry = {
      item,
      categoryId,
      tagIds,
      ruleId: null,
      historyPrevious: [],
    };

    if (rule) {
      try {
        const created = await createRule.mutateAsync({
          descriptionContains: rule.pattern,
          kind: rule.kind,
          categoryId,
          applyToHistory: true,
        });
        entry = {
          ...entry,
          ruleId: created.rule.id,
          historyPrevious: created.applied?.previous ?? [],
        };
      } catch (error) {
        // The same rule already exists: the goal of the checkbox is met. Anything else is told.
        if (!hasApiErrorCode(error, 'RULE_DUPLICATE')) {
          onError(
            `A transação foi salva, mas a regra não: ${getApiErrorMessage(error, 'tente criá-la pela tela Regras.')}`,
          );
        }
      }
    }

    return entry;
  };
}
