import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useDeleteRule } from '#/domain/categories/rule/hooks/use-delete-rule.hook.ts';
import { useRestoreBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-restore-bulk-transactions.hook.ts';
import type { RuleFormOutcome } from '#/features/rules/types/rule-form.type.ts';

/**
 * The undo toast after a rule is saved: "14 transações foram para Transporte" (undo restores them)
 * or "Regra criada" (undo deletes it). Lives in the screen, which stays mounted, not in the modal.
 */
export function useRuleOutcomeToasts() {
  const toast = useToast();
  const deleteRule = useDeleteRule();
  const restoreBulk = useRestoreBulkTransactions();
  const [undoError, setUndoError] = useState<string | null>(null);

  function fail() {
    setUndoError('Não deu para desfazer. Tente de novo.');
  }

  function announce({ rule, applied, created, categoryName }: RuleFormOutcome) {
    setUndoError(null);

    if (applied && applied.changedCount > 0) {
      const count = applied.changedCount;
      const subject = count === 1 ? '1 transação' : `${count} transações`;
      const message = categoryName
        ? `${subject} ${count === 1 ? 'foi' : 'foram'} para ${categoryName}.`
        : `${subject} ${count === 1 ? 'ganhou' : 'ganharam'} as tags da regra.`;

      toast.showUndoToast({
        message,
        withIcon: true,
        onUndo: () => {
          restoreBulk.mutateAsync({ items: applied.previous }).catch(fail);
        },
      });
      return;
    }

    if (created) {
      toast.showUndoToast({
        message: 'Regra criada. Vale para as próximas transações.',
        withIcon: true,
        onUndo: () => {
          deleteRule.mutateAsync(rule.id).catch(fail);
        },
      });
    }
  }

  return { announce, undoError, clearUndoError: () => setUndoError(null) };
}
