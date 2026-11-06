import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { useToast, type TransactionMenuKey } from '@fincheck/ui';
import { useRouter } from '@tanstack/react-router';

import type { CategoryPageModel } from '#/features/categories/category-page/category-page.model.ts';
import type { TransactionRowHandlers } from '#/shared/types/transactions/transaction-list-view.type.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';

type RowActionsArgs = {
  model: CategoryPageModel;
  transactions: readonly Transaction.Dto[];
  reportError: (error: unknown) => void;
};

/**
 * The handlers of the rows of this page. The editor and the splitter are Transações' own modals, so
 * "Editar" and "Dividir" go there, on the month of the transaction with its modal open; ignore,
 * bring back, accept the suggested category and the bank's change are done here, with the same
 * "Desfazer" the list gives.
 */
export function useCategoryRowActions({ model, transactions, reportError }: RowActionsArgs) {
  const router = useRouter();
  const { showUndoToast } = useToast();

  function find(id: string) {
    return transactions.find((item) => item.id === id);
  }

  function openInTransactions(id: string, panel: 'edit' | 'split') {
    const month = find(id)?.competenceOn.slice(0, 7);
    navigateToHref(router, buildHref(`/transactions?${panel}=${encodeURIComponent(id)}`, month));
  }

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

  async function acceptSuggestion(id: string, categoryId: string) {
    const transaction = find(id);
    if (!transaction) return;
    try {
      const result = await model.bulkTransactions.mutateAsync({
        transactionIds: [id],
        action: { type: 'categorize', categoryId },
      });
      if (result.updatedCount > 0) {
        showUndoToast({
          message: `${transaction.description} foi para a categoria sugerida.`,
          onUndo: () => model.restoreBulk.mutate({ items: result.previous }),
        });
      }
    } catch (error) {
      reportError(error);
    }
  }

  const handlers: TransactionRowHandlers = {
    onMenuAction: (id: string, action: TransactionMenuKey) => {
      if (action === 'edit') openInTransactions(id, 'edit');
      if (action === 'split') openInTransactions(id, 'split');
      if (action === 'ignore') void ignore(id);
      if (action === 'restore') void bringBack(id);
      if (action === 'create-rule') {
        navigateToHref(router, `/categories/rules?new=rule&from=${encodeURIComponent(id)}`);
      }
      if (action === 'create-recurrence') navigateToHref(router, '/recurrences');
    },
    // There is no selection mode on this page.
    onSelectedChange: () => undefined,
    onAcceptSuggestion: (id, categoryId) => void acceptSuggestion(id, categoryId),
    onChooseOtherCategory: (id) => openInTransactions(id, 'edit'),
    onResolveBankChange: (id, use) =>
      void model.resolveBankChange.mutateAsync({ id, body: { use } }).catch(reportError),
    // Restoring the bank's original asks for a confirmation, which lives in the editor.
    onRestoreOriginal: (id) => openInTransactions(id, 'edit'),
  };

  return handlers;
}
