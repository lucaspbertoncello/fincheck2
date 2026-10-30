import { ConfirmDialog, type ConfirmChange } from '@fincheck/ui';

type DeleteAccountViewProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  changes: ConfirmChange[];
  confirmLabel: string;
  isDeleting: boolean;
  onConfirm: () => void;
};

/** Delete confirmation with the impact counted by the API (RF-ACC-006, BR-ACC-008). */
export function DeleteAccountView({
  isOpen,
  onOpenChange,
  title,
  description,
  changes,
  confirmLabel,
  isDeleting,
  onConfirm,
}: DeleteAccountViewProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      destructive
      title={title}
      description={description}
      changes={changes}
      confirmLabel={confirmLabel}
      loading={isDeleting}
      onConfirm={onConfirm}
    />
  );
}
