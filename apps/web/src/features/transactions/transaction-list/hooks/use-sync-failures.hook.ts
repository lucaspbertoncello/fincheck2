import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { SyncFailureView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';

type SyncFailuresArgs = {
  model: TransactionListModel;
  reportError: (error: unknown) => void;
};

/**
 * The banks whose last sync ended in error, for the "Não deu para sincronizar" banner. "Tentar
 * agora" fetches again what Pluggy already has (it starts a run, it does not reconnect), and the
 * list refreshes when the run is done.
 */
export function useSyncFailures({ model, reportError }: SyncFailuresArgs): SyncFailureView[] {
  return (model.connections.data?.items ?? [])
    .filter((connection) => connection.status === 'error')
    .map((connection) => ({
      connectionId: connection.id,
      institution: connection.institutionName,
      detail:
        'A lista mostra o que já estava guardado. Se persistir, reconecte o banco no Open Finance.',
      retrying: model.startRun.isPending && model.startRun.variables === connection.id,
      onRetry: () => model.startRun.mutate(connection.id, { onError: reportError }),
    }));
}
