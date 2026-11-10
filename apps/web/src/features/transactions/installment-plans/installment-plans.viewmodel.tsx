import { useToast } from '@fincheck/ui';
import { useParams, useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { installmentPlansSearchSchema } from '#/features/transactions/installment-plans/schemas/installment-plans-search.schema.ts';
import { useInstallmentPlansModel } from '#/features/transactions/installment-plans/installment-plans.model.ts';
import { InstallmentPlansView } from '#/features/transactions/installment-plans/installment-plans.view.tsx';
import type { InstallmentPlansViewProps } from '#/features/transactions/installment-plans/types/installment-plans.type.ts';
import { buildInstallmentPlanRow } from '#/features/transactions/installment-plans/utils/build-installment-plan-row.util.ts';
import { describeInstallmentPlansSummary } from '#/features/transactions/installment-plans/utils/describe-installment-plans-summary.util.ts';
import { InstallmentPlanModal } from '#/features/transactions/transaction-creation/installment-plan-modal.component.tsx';
import { describeInstallmentPlanError } from '#/shared/utils/transactions/describe-installment-plan-error.util.ts';
import { useScreenSearch } from '#/shared/hooks/use-screen-search.hook.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';

const BACK = { path: '/accounts', label: 'Contas e cartões' } as const;

/** The page of one card (`/cards/:id/installments`); the state resets with each card. */
function InstallmentPlansContent({ cardId }: { cardId: string }) {
  const model = useInstallmentPlansModel(cardId);
  const { search, update } = useScreenSearch(installmentPlansSearchSchema);
  const toast = useToast();
  const router = useRouter();
  const { monthParam } = useActiveScreen();
  const [actionError, setActionError] = useState<string | null>(null);

  const backHref = buildHref(BACK.path, monthParam);
  const rows = model.plans.map((plan) => ({
    plan,
    row: buildInstallmentPlanRow(plan, model.categories),
  }));
  const active = rows.filter(({ row }) => !row.isSettled).map(({ row }) => row);
  // The newest purchase first.
  const settled = rows
    .filter(({ row }) => row.isSettled)
    .sort((a, b) => b.plan.purchaseOn.localeCompare(a.plan.purchaseOn))
    .map(({ row }) => row);

  const editing = search.edit ? model.plans.find((plan) => plan.id === search.edit) : undefined;
  const removing = search.remove
    ? model.plans.find((plan) => plan.id === search.remove)
    : undefined;

  function confirmDelete() {
    if (!removing) return;
    const name = removing.description;
    setActionError(null);
    model.deletePlan.mutate(removing.id, {
      onSuccess: () => {
        update({ remove: undefined });
        toast.showUndoToast({
          message: `${name} excluída. As parcelas saíram das faturas.`,
          actionLabel: 'Ok',
          onUndo: () => undefined,
          timeout: 4000,
        });
      },
      onError: (error) => {
        update({ remove: undefined });
        setActionError(describeInstallmentPlanError(error));
      },
    });
  }

  const state: InstallmentPlansViewProps['state'] = model.isMissing
    ? 'not-found'
    : model.isError
      ? 'error'
      : model.isLoading
        ? 'loading'
        : 'ready';

  return (
    <>
      <InstallmentPlansView
        state={state}
        title={
          state === 'not-found'
            ? 'Cartão não encontrado'
            : model.cardName
              ? `Compras parceladas do ${model.cardName}`
              : 'Compras parceladas'
        }
        description={
          state === 'ready' ? describeInstallmentPlansSummary(active.length, settled.length) : ' '
        }
        backHref={backHref}
        backLabel={BACK.label}
        onRetry={model.retry}
        onBack={() => navigateToHref(router, backHref)}
        onCreate={() => update({ new: 'installment' })}
        actionError={actionError}
        onDismissActionError={() => setActionError(null)}
        active={active}
        settled={settled}
        onEdit={(planId) => update({ edit: planId })}
        onDelete={(planId) => update({ remove: planId })}
        deleteTarget={
          removing
            ? { name: removing.description, installmentCount: removing.installmentCount }
            : null
        }
        deleting={model.deletePlan.isPending}
        onConfirmDelete={confirmDelete}
        onCancelDelete={() => update({ remove: undefined })}
      />
      {search.new === 'installment' ? (
        <InstallmentPlanModal cardId={cardId} onClose={() => update({ new: undefined })} />
      ) : null}
      {editing && editing.origin === 'manual' ? (
        <InstallmentPlanModal
          key={editing.id}
          plan={editing}
          onClose={() => update({ edit: undefined })}
        />
      ) : null}
    </>
  );
}

/** "Compras parceladas" of a card: reads the card from the address and mounts the content for it. */
export function InstallmentPlansViewModel() {
  const { accountId = '' } = useParams({ strict: false });

  return <InstallmentPlansContent key={accountId} cardId={accountId} />;
}
