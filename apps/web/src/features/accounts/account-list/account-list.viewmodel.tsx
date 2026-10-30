import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useAccountsSearch } from '#/features/accounts/account-search/hooks/use-accounts-search.hook.ts';
import { useAccountListModel } from '#/features/accounts/account-list/account-list.model.ts';
import { AccountListView } from '#/features/accounts/account-list/account-list.view.tsx';
import type {
  ConnectionFailureData,
  HistoryProgressData,
} from '#/features/accounts/account-list/types/account-list.type.ts';
import { buildAccountTile } from '#/features/accounts/account-list/utils/build-account-tile.util.ts';
import { buildCardBlock } from '#/features/accounts/account-list/utils/build-card-block.util.ts';
import { describeConnectionError } from '#/features/accounts/account-list/utils/describe-connection-error.util.ts';
import { formatSyncAge } from '#/features/accounts/account-list/utils/format-sync-age.util.ts';
import { getHistoryProgress } from '#/features/accounts/account-list/utils/get-history-progress.util.ts';
import { sumTotalBalance } from '#/features/accounts/account-list/utils/sum-total-balance.util.ts';
import { FutureInvoicesViewModel } from '#/features/invoices/future-invoices/future-invoices.viewmodel.tsx';
import { getTodayBusinessDate } from '#/features/invoices/invoice-summary/utils/get-today-business-date.util.ts';

/** Contas e cartões: turns the model into what the view draws and wires its actions. */
export function AccountListViewModel() {
  const model = useAccountListModel();
  const { search, update } = useAccountsSearch();
  const toast = useToast();
  const [actionError, setActionError] = useState<string | null>(null);
  const now = new Date();
  const today = getTodayBusinessDate(now);

  const connectionsById = new Map(model.connections.map((item) => [item.id, item]));
  const invoicesByCard = new Map(model.openInvoices.map((item) => [item.accountId, item.invoice]));
  const accountsById = new Map(model.accounts.map((item) => [item.id, item]));

  const active = model.accounts.filter((account) => !account.archivedAt);
  const cards = active
    .filter((account) => account.type === 'credit_card')
    .map((card) =>
      buildCardBlock({ card, invoice: invoicesByCard.get(card.id), plans: model.plans, today }),
    );
  const toTile = (account: Account.Dto) =>
    buildAccountTile({
      account,
      connection: account.connection
        ? connectionsById.get(account.connection.connectionId)
        : undefined,
      history: model.curves[account.id],
      now,
    });
  const tiles = active.filter((account) => account.type !== 'credit_card').map(toTile);
  const archived = model.accounts.filter((account) => account.archivedAt).map(toTile);

  const progress: HistoryProgressData[] = model.connections
    .filter((item) => item.status !== 'disconnected' && item.history.status !== 'done')
    .map((item) => {
      const { monthsDone, monthsTotal } = getHistoryProgress(item.history.fromOn, today);
      const count = item.history.transactionCount.toLocaleString('pt-BR');
      return {
        connectionId: item.id,
        title: `Buscando o histórico do ${item.institutionName}`,
        detail: `${monthsDone} de cerca de ${monthsTotal} meses, ${count} transações. O app segue usável.`,
      };
    });

  const failures: ConnectionFailureData[] = model.connections
    .filter((item) => item.status === 'error')
    .map((item) => {
      const reason = describeConnectionError(item.errorCode);
      const age = item.lastBankUpdateAt
        ? `Último dado ${formatSyncAge(item.lastBankUpdateAt, now)}.`
        : '';
      return {
        connectionId: item.id,
        institution: item.institutionName,
        detail: [
          reason ? `${capitalize(reason)}.` : '',
          age,
          'Reconecte no Meu Pluggy se persistir.',
        ]
          .filter(Boolean)
          .join(' '),
        retrying: model.startRun.isPending && model.startRun.variables === item.id,
      };
    });

  function handleRetryConnection(connectionId: string) {
    setActionError(null);
    const name = connectionsById.get(connectionId)?.institutionName ?? 'o banco';
    model.startRun.mutate(connectionId, {
      onError: () =>
        setActionError(`Não deu para buscar de novo os dados do ${name}. Tente mais tarde.`),
    });
  }

  function handleArchive(accountId: string) {
    const name = accountsById.get(accountId)?.name ?? 'Conta';
    setActionError(null);
    model.archive.mutate(accountId, {
      onSuccess: () =>
        toast.showUndoToast({
          message: `${name} arquivada. O histórico continua somando nos meses passados.`,
          onUndo: () => model.unarchive.mutate(accountId),
        }),
      onError: () => setActionError(`Não deu para arquivar ${name}. Tente de novo.`),
    });
  }

  function handleUnarchive(accountId: string) {
    const name = accountsById.get(accountId)?.name ?? 'Conta';
    setActionError(null);
    model.unarchive.mutate(accountId, {
      onError: () => setActionError(`Não deu para desarquivar ${name}. Tente de novo.`),
    });
  }

  function handleMenuAction(accountId: string, key: string) {
    if (key === 'archive') handleArchive(accountId);
    if (key === 'unarchive') handleUnarchive(accountId);
    if (key === 'delete') update({ remove: accountId });
  }

  const state = model.isLoading
    ? 'loading'
    : model.isError
      ? 'error'
      : model.accounts.length === 0
        ? 'empty'
        : 'ready';

  return (
    <AccountListView
      state={state}
      onRetry={model.retry}
      progress={progress}
      failures={failures}
      onRetryConnection={handleRetryConnection}
      actionError={actionError}
      cards={cards}
      accounts={tiles}
      archived={archived}
      totalCents={sumTotalBalance(model.accounts)}
      futureSlot={
        search.future ? (
          <FutureInvoicesViewModel
            cardId={search.future}
            onBack={() => update({ future: undefined })}
            onViewInvoice={(month) =>
              update({ future: undefined, invoice: `${search.future}:${month}` })
            }
          />
        ) : undefined
      }
      onConnect={() => update({ new: 'account' })}
      onViewInvoice={(cardId, month) => update({ invoice: `${cardId}:${month}` })}
      onCorrectInvoice={(cardId, month) => update({ correct: `${cardId}:${month}` })}
      onOpenFuture={(cardId) => update({ future: cardId })}
      onCardMenuAction={handleMenuAction}
      onAccountAction={(accountId) => update({ adjust: accountId })}
      onAccountMenuAction={handleMenuAction}
    />
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
