import { useState } from 'react';

import { useAccountsSearch } from '#/features/accounts/account-search/hooks/use-accounts-search.hook.ts';
import { useDeleteAccountModel } from '#/features/accounts/delete-account/delete-account.model.ts';
import { DeleteAccountView } from '#/features/accounts/delete-account/delete-account.view.tsx';
import { buildDeletionChanges } from '#/features/accounts/delete-account/utils/build-deletion-changes.util.ts';

/** The confirmation before deleting an account or card. Opens by `?remove=<accountId>`. */
export function DeleteAccountViewModel() {
  const { search, update } = useAccountsSearch();
  const model = useDeleteAccountModel(search.remove);
  const [failed, setFailed] = useState(false);

  function close() {
    setFailed(false);
    update({ remove: undefined });
  }

  function confirm() {
    if (model.isImpactError) {
      model.retryImpact();
      return;
    }
    if (!model.account || !model.impact) return;
    setFailed(false);
    model.remove.mutate(model.account.id, { onSuccess: close, onError: () => setFailed(true) });
  }

  const name = model.account?.name ?? 'a conta';
  const description = failed
    ? 'Não deu para excluir agora. Tente de novo; nada foi apagado.'
    : model.isImpactError
      ? 'Não deu para calcular o que será apagado. Tente de novo.'
      : model.isLoadingImpact || !model.impact
        ? 'Calculando o que será apagado...'
        : 'Isto apaga a conta e tudo que depende dela. Não dá para desfazer.';

  return (
    <DeleteAccountView
      isOpen={Boolean(search.remove)}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={`Excluir ${name}?`}
      description={description}
      changes={model.impact ? buildDeletionChanges(model.impact) : []}
      confirmLabel={model.isImpactError ? 'Tentar de novo' : 'Excluir'}
      isDeleting={model.remove.isPending}
      onConfirm={confirm}
    />
  );
}
