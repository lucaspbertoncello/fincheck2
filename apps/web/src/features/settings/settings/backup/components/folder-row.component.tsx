import { Button, TextField } from '@fincheck/ui';

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

/** The backup folder: its path with "Trocar pasta", or the text field that the API checks. */
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
  if (isEditing) {
    return (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="flex flex-col gap-s12"
      >
        <TextField
          label="Caminho da pasta"
          value={draft}
          onChange={onDraftChange}
          error={error ?? undefined}
          description="A pasta precisa existir e aceitar gravação."
          placeholder="D:\Backups\Fincheck"
          autoComplete="off"
          autoFocus
          maxLength={260}
        />
        <div className="flex flex-wrap gap-s8">
          <Button type="submit" size="sm" loading={isSaving}>
            Usar esta pasta
          </Button>
          <Button variant="secondary" size="sm" isDisabled={isSaving} onPress={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

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
    </div>
  );
}
