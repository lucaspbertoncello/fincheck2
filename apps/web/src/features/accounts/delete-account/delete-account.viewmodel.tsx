import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useAccountsSearch } from '#/shared/hooks/accounts/use-accounts-search.hook.ts';
import { useDeleteAccountModel } from '#/features/accounts/delete-account/delete-account.model.ts';
import { DeleteAccountView } from '#/features/accounts/delete-account/delete-account.view.tsx';
import { buildDeletionSummary } from '#/features/accounts/delete-account/utils/build-deletion-summary.util.ts';

/** The confirmation before deleting an account or card, or archiving it instead. Opens by `?remove=<accountId>`. */
export function DeleteAccountViewModel() {
  const { search, update } = useAccountsSearch();
  const model = useDeleteAccountModel(search.remove);
  const toast = useToast();
  const [failed, setFailed] = useState(false);

  function close() {
    setFailed(false);
    update({ remove: undefined });
  }

  function remove() {
    if (!model.account || !model.impact) return;
    setFailed(false);
    model.remove.mutate(model.account.id, { onSuccess: close, onError: () => setFailed(true) });
  }

  function archive() {
    const account = model.account;
    if (!account) return;
    setFailed(false);
    model.archive.mutate(account.id, {
      onSuccess: () => {
        close();
        toast.showUndoToast({
          message: `${account.name} arquivada. O histórico continua somando nos meses passados.`,
          onUndo: () => model.unarchive.mutate(account.id),
        });
      },
      onError: () => setFailed(true),
    });
  }

  const state = model.isImpactError
    ? 'error'
    : model.isLoadingImpact || !model.impact
      ? 'loading'
      : 'ready';

  return (
    <DeleteAccountView
      isOpen={Boolean(search.remove)}
      onClose={close}
      title={`Excluir ${model.account?.name ?? 'a conta'}?`}
      state={state}
      summary={model.impact ? buildDeletionSummary(model.impact) : null}
      canArchive={model.account ? !model.account.archivedAt : false}
      failed={failed}
      isDeleting={model.remove.isPending}
      isArchiving={model.archive.isPending}
      onRetry={model.retryImpact}
      onArchive={archive}
      onDelete={remove}
    />
  );
}
