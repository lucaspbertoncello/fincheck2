import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { useToast } from '@fincheck/ui';

import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';

type RowActionsArgs = {
  model: TransactionListModel;
  lookups: TransactionLookups;
  /** Starts the "criar regra" question for transactions just recategorized. */
  askRule: (ids: string[]) => void;
  reportError: (error: unknown) => void;
};

/**
 * The one-shot actions of a row: ignore and bring back (with "Desfazer"), accept the suggested
 * category (through the bulk route, which returns the "before" the undo needs), resolve a change the
 * bank made, restore the bank's original and delete. A failure goes to `reportError`.
 */
export function useRowActions({ model, lookups, askRule, reportError }: RowActionsArgs) {
  const { showUndoToast } = useToast();

  async function ignore(id: string) {
    try {
      await model.ignoreTransaction.mutateAsync(id);
      showUndoToast({
        message: 'Transação ignorada. Ela sai das contas do mês.',
        onUndo: () => model.unignoreTransaction.mutate(id),
      });
    } catch (error) {
      reportError(error);
    }
  }

  async function bringBack(id: string) {
    try {
      await model.unignoreTransaction.mutateAsync(id);
    } catch (error) {
      reportError(error);
    }
  }

  /** Puts a category on one transaction, with "Desfazer", and asks about a rule. */
  async function recategorize(transaction: Transaction.Dto, categoryId: string) {
    const categoryName = lookups.categories.get(categoryId)?.name ?? 'a categoria';
    try {
      const result = await model.bulkTransactions.mutateAsync({
        transactionIds: [transaction.id],
        action: { type: 'categorize', categoryId },
      });
      if (result.updatedCount > 0) {
        showUndoToast({
          message: `${transaction.description} agora está em ${categoryName}.`,
          onUndo: () => model.restoreBulk.mutate({ items: result.previous }),
        });
        askRule([transaction.id]);
      }
    } catch (error) {
      reportError(error);
      throw error;
    }
  }

  async function resolveBankChange(id: string, use: 'bank' | 'mine') {
    try {
      await model.resolveBankChange.mutateAsync({ id, body: { use } });
    } catch (error) {
      reportError(error);
    }
  }

  async function restoreOriginal(id: string) {
    await model.restoreOriginal.mutateAsync(id);
  }

  async function remove(id: string) {
    await model.deleteTransaction.mutateAsync(id);
  }

  return { ignore, bringBack, recategorize, resolveBankChange, restoreOriginal, remove };
}
