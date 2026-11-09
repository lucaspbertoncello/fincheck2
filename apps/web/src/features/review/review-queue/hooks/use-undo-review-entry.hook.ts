import { useDeleteRule } from '#/domain/categories/rule/hooks/use-delete-rule.hook.ts';
import { useRestoreBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-restore-bulk-transactions.hook.ts';
import { useUpdateTransaction } from '#/domain/transactions/transaction/hooks/use-update-transaction.hook.ts';
import type { ReviewedEntry } from '#/features/review/review-queue/review-queue.type.ts';
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';

type UndoReviewEntryInput = {
  onUndone: (entry: ReviewedEntry) => void;
  onError: (message: string) => void;
};

/** Reverts a saved entry: the history the rule changed, the rule itself and the category. */
export function useUndoReviewEntry({ onUndone, onError }: UndoReviewEntryInput) {
  const restoreBulk = useRestoreBulkTransactions();
  const deleteRule = useDeleteRule();
  const updateTransaction = useUpdateTransaction();

  return async function undoEntry(entry: ReviewedEntry) {
    try {
      if (entry.historyPrevious.length > 0) {
        await restoreBulk.mutateAsync({ items: entry.historyPrevious });
      }
      if (entry.ruleId) await deleteRule.mutateAsync(entry.ruleId);
      await updateTransaction.mutateAsync({
        id: entry.item.transaction.id,
        body: { categoryId: null },
      });
      onUndone(entry);
    } catch (error) {
      onError(getApiErrorMessage(error, 'Não deu para desfazer. Tente de novo.'));
    }
  };
}
