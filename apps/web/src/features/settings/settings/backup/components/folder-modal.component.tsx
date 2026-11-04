import { FormModal, FormModalGroup, TextField } from '@fincheck/ui';

export type FolderModalProps = {
  isEditing: boolean;
  draft: string;
  error: string | null;
  isSaving: boolean;
  onStartEditing: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

/** The form modal that changes (or picks) the backup folder; the API checks the path. */
export function FolderModal({
  isEditing,
  draft,
  error,
  isSaving,
  onDraftChange,
  onSave,
  onCancel,
}: Omit<FolderModalProps, 'onStartEditing'>) {
  return (
    <FormModal
      isOpen={isEditing}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      size="default"
      title="Pasta dos backups"
      description="Onde o app guarda uma cópia do banco por dia."
      submitLabel="Usar esta pasta"
      onSubmit={onSave}
      isSubmitting={isSaving}
    >
      <FormModalGroup>
        <TextField
          label="Caminho da pasta"
          value={draft}
          onChange={onDraftChange}
          error={error ?? undefined}
          description="A pasta precisa existir e aceitar gravação."
          placeholder="D:\Backups\Fincheck"
          autoComplete="off"
          maxLength={260}
        />
      </FormModalGroup>
    </FormModal>
  );
}
