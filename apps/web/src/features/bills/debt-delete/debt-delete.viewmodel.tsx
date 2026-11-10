import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useDeleteBill } from '#/domain/bills/bill/hooks/use-delete-bill.hook.ts';
import type { DebtDeleteTarget } from '#/features/bills/debt-delete/debt-delete.model.ts';
import { describeDebtDelete } from '#/features/bills/debt-delete/utils/describe-debt-delete.util.ts';
import { DebtDeleteView } from '#/features/bills/debt-delete/debt-delete.view.tsx';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';

const NO_EFFECTS = { hasOrigin: false, hasLinkedPayments: false };

type DebtDeleteDialogProps = {
  /** The debt to delete; null keeps the dialog closed. */
  target: DebtDeleteTarget | null;
  onClose: () => void;
  /** The sentence of a delete that failed, for the screen to show. */
  onError: (message: string) => void;
};

/**
 * Confirms and deletes a friend debt, from the Amigos tab and from A pagar e receber (one dialog
 * for both). The delete has no undo: the toast only says it happened.
 */
export function DebtDeleteDialog({ target, onClose, onError }: DebtDeleteDialogProps) {
  const deleteBill = useDeleteBill();
  const { showUndoToast } = useToast();
  // The dialog fades out after the target is gone: it keeps the last one, so its text does not
  // change while it leaves.
  const [last, setLast] = useState<DebtDeleteTarget | null>(target);
  if (target && target !== last) setLast(target);
  const shown = target ?? last;

  async function confirm() {
    if (!target || deleteBill.isPending) return;
    const { billId, person } = target;
    try {
      await deleteBill.mutateAsync(billId);
      onClose();
      showUndoToast({
        message: person ? `Dívida com ${person} excluída.` : 'Dívida excluída.',
        actionLabel: 'Ok',
        onUndo: () => undefined,
        withIcon: true,
        timeout: 4000,
      });
    } catch (error) {
      onClose();
      onError(describeApiError(error));
    }
  }

  return (
    <DebtDeleteView
      isOpen={target !== null}
      description={
        shown
          ? describeDebtDelete(shown.person, shown.effects)
          : describeDebtDelete(null, NO_EFFECTS)
      }
      isDeleting={deleteBill.isPending}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    />
  );
}
