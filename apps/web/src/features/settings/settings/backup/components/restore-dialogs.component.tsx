import { Button, ChoiceChip, ConfirmDialog, Modal, Skeleton } from '@fincheck/ui';

import type { BackupFileItem } from '#/features/settings/settings/backup/types/backup-file-item.type.ts';

export type RestoreDialogsProps = {
  step: 'closed' | 'choose' | 'confirm';
  isFilesLoading: boolean;
  isFilesError: boolean;
  files: BackupFileItem[];
  selectedFile: string | null;
  selectedDay: string | null;
  error: string | null;
  isRestoring: boolean;
  onSelectFile: (fileName: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onRetryFiles: () => void;
};

/** "Restaurar um backup": choose one file of the folder, then confirm (RF-BKP-003, BR-BKP-002). */
export function RestoreDialogs({
  step,
  isFilesLoading,
  isFilesError,
  files,
  selectedFile,
  selectedDay,
  error,
  isRestoring,
  onSelectFile,
  onContinue,
  onBack,
  onClose,
  onConfirm,
  onRetryFiles,
}: RestoreDialogsProps) {
  return (
    <>
      <Modal
        isOpen={step === 'choose'}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Restaurar um backup"
        subtitle="Escolha o dia a que o app deve voltar."
        actions={
          <>
            <Button variant="secondary" onPress={onClose}>
              Cancelar
            </Button>
            <Button isDisabled={selectedFile === null} onPress={onContinue}>
              Continuar
            </Button>
          </>
        }
      >
        {isFilesLoading ? (
          <div role="status" aria-label="Carregando os backups" className="flex flex-col gap-s8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}
        {isFilesError ? (
          <div role="alert" className="flex flex-col items-start gap-s12">
            <p className="text-label text-fg-secondary">Não deu para ler a pasta dos backups.</p>
            <Button variant="secondary" size="sm" icon="sync" onPress={onRetryFiles}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
        {!isFilesLoading && !isFilesError && files.length === 0 ? (
          <p className="text-label text-fg-secondary">Ainda não há backups nessa pasta.</p>
        ) : null}
        {files.length > 0 ? (
          <div role="group" aria-label="Backups da pasta" className="flex flex-col gap-s8">
            {files.map((file) => (
              <ChoiceChip
                key={file.fileName}
                selected={selectedFile === file.fileName}
                onChange={() => onSelectFile(file.fileName)}
                className="justify-start"
              >
                {file.label}
              </ChoiceChip>
            ))}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-meta text-loss">
            {error}
          </p>
        ) : null}
      </Modal>
      <ConfirmDialog
        isOpen={step === 'confirm'}
        onOpenChange={(open) => {
          if (!open) onBack();
        }}
        destructive
        icon="history"
        title={`Restaurar o backup de ${selectedDay ?? ''}?`}
        description="O app troca o banco atual pelo desse backup."
        changes={[
          { text: 'Antes, o app guarda uma cópia do banco de agora na mesma pasta.' },
          { icon: 'warning', text: 'O que foi lançado depois desse dia deixa de aparecer.' },
          { text: 'O app reabre sozinho com os dados do backup.' },
        ]}
        confirmLabel="Restaurar"
        cancelLabel="Voltar"
        loading={isRestoring}
        onConfirm={onConfirm}
      />
    </>
  );
}
