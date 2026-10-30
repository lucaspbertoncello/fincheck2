import { Button, FormModal, FormModalGroup, TextField } from '@fincheck/ui';

export type FolderRowProps = {
  folderPath: string | null;
  isEditing: boolean;
  draft: string;
  error: string | null;
  isSaving: boolean;
  onStartEditing: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

/** The backup folder: its path with "Trocar pasta"; changing it opens a form modal the API checks. */
export function FolderRow({
  folderPath,
  isEditing,
  draft,
  error,
  isSaving,
  onStartEditing,
  onDraftChange,
  onSave,
  onCancel,
}: FolderRowProps) {
  return (
    <div className="flex items-start justify-between gap-s16 max-lg:flex-col">
      <div className="flex min-w-0 flex-col gap-s4">
        <p className="text-body font-emphasis text-fg-primary">Pasta</p>
        {folderPath ? (
          <p className="text-label font-plain break-all text-fg-secondary tabular-nums">
            {folderPath}
          </p>
        ) : (
          <p className="text-label text-fg-secondary">Nenhuma pasta escolhida ainda.</p>
        )}
      </div>
      <Button variant="tertiary" size="sm" icon="folder" onPress={onStartEditing}>
        {folderPath ? 'Trocar pasta' : 'Escolher pasta'}
      </Button>
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
    </div>
  );
}
