import { useToast } from '@fincheck/ui';

import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';

type RuleQuestionArgs = {
  model: TransactionListModel;
  lookups: TransactionLookups;
  /** Transactions just recategorized; the question is about them. */
  ids: readonly string[];
  clear: () => void;
};

/**
 * After a recategorization, "Criar regra para UBER *TRIP?" (RF-CAT-005): the first suggestion the
 * API has for those transactions, with "Criar regra" (applies to the history, with "Desfazer")
 * and "Agora não".
 */
export function useRuleQuestion({ model, lookups, ids, clear }: RuleQuestionArgs) {
  const { showUndoToast } = useToast();
  const suggestion = ids.length > 0 ? model.ruleSuggestions.data?.items[0] : undefined;
  const categoryName = suggestion
    ? (lookups.categories.get(suggestion.categoryId)?.name ?? '')
    : '';

  const question = suggestion
    ? {
        message: `Criar regra para “${suggestion.pattern}”? Quando a descrição tiver esse texto, a categoria vira ${categoryName}. Pega ${countWord(suggestion.willChangeCount, 'transação', 'transações')} do histórico.`,
        creating: model.acceptRuleSuggestion.isPending,
        error: model.acceptRuleSuggestion.isError
          ? 'Não deu para criar a regra. Tente de novo.'
          : undefined,
        onCreate: async () => {
          const result = await model.acceptRuleSuggestion
            .mutateAsync({
              pattern: suggestion.pattern,
              categoryId: suggestion.categoryId,
              applyToHistory: true,
            })
            .catch(() => null);
          if (!result) return;
          clear();
          const previous = result.applied?.previous ?? [];
          showUndoToast({
            message: `Regra criada. ${countWord(result.applied?.changedCount ?? 0, 'transação foi', 'transações foram')} para ${categoryName}.`,
            onUndo: () => {
              if (previous.length > 0) model.restoreBulk.mutate({ items: previous });
            },
          });
        },
        onDismiss: () => {
          model.dismissRuleSuggestion.mutate({
            pattern: suggestion.pattern,
            categoryId: suggestion.categoryId,
          });
          clear();
        },
      }
    : null;

  return question;
}
