import { useToast } from '@fincheck/ui';

import { useAcceptRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-accept-rule-suggestion.hook.ts';
import { useDismissRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-dismiss-rule-suggestion.hook.ts';
import { useDeleteRule } from '#/domain/categories/rule/hooks/use-delete-rule.hook.ts';
import { useRestoreBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-restore-bulk-transactions.hook.ts';
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';

type ReviewRuleSuggestion = {
  pattern: string;
  categoryId: string;
  willChangeCount: number;
};

/** Accepts or dismisses the rule suggestion on screen; accepting leaves a toast that undoes it. */
export function useReviewRuleSuggestion({ onError }: { onError: (message: string) => void }) {
  const { showUndoToast } = useToast();
  const acceptSuggestion = useAcceptRuleSuggestion();
  const dismissSuggestion = useDismissRuleSuggestion();
  const restoreBulk = useRestoreBulkTransactions();
  const deleteRule = useDeleteRule();

  async function accept(suggestion: ReviewRuleSuggestion) {
    try {
      const created = await acceptSuggestion.mutateAsync({
        pattern: suggestion.pattern,
        categoryId: suggestion.categoryId,
        applyToHistory: suggestion.willChangeCount > 0,
      });
      const previous = created.applied?.previous ?? [];
      showUndoToast({
        message: `Regra criada para “${suggestion.pattern}”`,
        onUndo: () => {
          void (async () => {
            try {
              if (previous.length > 0) await restoreBulk.mutateAsync({ items: previous });
              await deleteRule.mutateAsync(created.rule.id);
            } catch (error) {
              onError(getApiErrorMessage(error, 'Não deu para desfazer. Tente de novo.'));
            }
          })();
        },
        withIcon: true,
      });
    } catch (error) {
      onError(getApiErrorMessage(error, 'Não deu para criar a regra. Tente de novo.'));
    }
  }

  function dismiss(suggestion: Pick<ReviewRuleSuggestion, 'pattern' | 'categoryId'>) {
    dismissSuggestion
      .mutateAsync({ pattern: suggestion.pattern, categoryId: suggestion.categoryId })
      .catch((error: unknown) =>
        onError(getApiErrorMessage(error, 'Não deu para dispensar. Tente de novo.')),
      );
  }

  return { accept, dismiss };
}
