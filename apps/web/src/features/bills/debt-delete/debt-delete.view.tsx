import { ConfirmDialog } from '@fincheck/ui';

import type { DebtDeleteViewProps } from '#/features/bills/debt-delete/debt-delete.model.ts';

/**
 * "Excluir esta dívida?": the confirmation before a friend debt goes away. The API keeps nothing of
 * a deleted debt, so the words say there is no undo (and what happens to its transactions).
 */
export function DebtDeleteView({
  isOpen,
  description,
  isDeleting,
  onConfirm,
  onCancel,
}: DebtDeleteViewProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      destructive
      icon="trash"
      title="Excluir esta dívida?"
      description={description}
      confirmLabel="Excluir"
      onConfirm={onConfirm}
      loading={isDeleting}
    />
  );
}
