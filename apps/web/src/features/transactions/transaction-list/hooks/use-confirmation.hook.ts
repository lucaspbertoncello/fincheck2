import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { useState } from 'react';

import type { useRowActions } from '#/features/transactions/transaction-list/hooks/use-row-actions.hook.ts';
import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { ConfirmView } from '#/shared/types/transactions/transaction-list-view.type.ts';

type ConfirmKind = 'delete' | 'restore-original' | 'unsplit';

type ConfirmationArgs = {
  model: TransactionListModel;
  rowActions: ReturnType<typeof useRowActions>;
  findTransaction: (id: string | undefined) => Transaction.Dto | undefined;
  closePanels: () => void;
  reportError: (error: unknown) => void;
};

/**
 * The confirmation dialog of the destructive actions (delete, restore the bank's original, undo a
 * split): `ask` opens it for one transaction, `view` is what the View draws (null when closed).
 */
export function useConfirmation({
  model,
  rowActions,
  findTransaction,
  closePanels,
  reportError,
}: ConfirmationArgs) {
  const [state, setState] = useState<{ kind: ConfirmKind; id: string } | null>(null);

  function buildView(): ConfirmView | null {
    if (!state) return null;
    const { kind, id } = state;
    const name = findTransaction(id)?.description ?? 'esta transação';
    const run = async (action: () => Promise<unknown>) => {
      try {
        await action();
        if (kind !== 'restore-original') closePanels();
      } catch (caught) {
        reportError(caught);
      }
      setState(null);
    };
    const base = { onClose: () => setState(null) };

    if (kind === 'delete') {
      return {
        ...base,
        title: 'Excluir esta transação?',
        description: `“${name}” sai das contas e não dá para desfazer.`,
        confirmLabel: 'Excluir',
        destructive: true,
        loading: model.deleteTransaction.isPending,
        onConfirm: () => void run(() => rowActions.remove(id)),
      };
    }
    if (kind === 'unsplit') {
      return {
        ...base,
        title: 'Desfazer a divisão?',
        description:
          'A transação volta a ser uma só e vai para “Para revisar” até ganhar uma categoria.',
        confirmLabel: 'Desfazer a divisão',
        destructive: true,
        loading: model.unsplitTransaction.isPending,
        onConfirm: () => void run(() => model.unsplitTransaction.mutateAsync(id)),
      };
    }
    return {
      ...base,
      title: 'Restaurar o original do banco?',
      description: 'Descrição, valor e data voltam ao que o banco mandou. A sua edição se perde.',
      confirmLabel: 'Restaurar original',
      destructive: false,
      loading: model.restoreOriginal.isPending,
      onConfirm: () => void run(() => rowActions.restoreOriginal(id)),
    };
  }

  return {
    view: buildView(),
    ask: (kind: ConfirmKind, id: string) => setState({ kind, id }),
  };
}
