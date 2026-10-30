import { Button, FineNote, OkLine, Section } from '@fincheck/ui';

import { SectionError } from '#/features/settings/settings/components/section-error.component.tsx';
import { SectionSkeleton } from '#/features/settings/settings/components/section-skeleton.component.tsx';
import {
  FolderRow,
  type FolderRowProps,
} from '#/features/settings/settings/backup/components/folder-row.component.tsx';
import {
  RestoreDialogs,
  type RestoreDialogsProps,
} from '#/features/settings/settings/backup/components/restore-dialogs.component.tsx';

type BackupViewProps = {
  state: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  folderPath: string | null;
  /** "Último backup hoje às 03:00, 14,2 MB. Um por dia, os últimos 30 guardados." */
  lastBackupLine: string | null;
  nextBackupLine: string | null;
  /** The failure of the last backup, when there was one. */
  errorLine: string | null;
  /** The sentence under an action that failed. */
  actionError: string | null;
  /** Name of the safety copy made by the last restore. */
  safetyCopy: string | null;
  isRunning: boolean;
  onRunBackup: () => void;
  folder: Omit<FolderRowProps, 'folderPath'>;
  restore: RestoreDialogsProps & { onOpen: () => void };
};

/** "Backup": the folder, the last backup, "Fazer backup agora" and "Restaurar um backup". */
export function BackupView({
  state,
  onRetry,
  folderPath,
  lastBackupLine,
  nextBackupLine,
  errorLine,
  actionError,
  safetyCopy,
  isRunning,
  onRunBackup,
  folder,
  restore,
}: BackupViewProps) {
  return (
    <Section title="Backup" variant="glass">
      {state === 'loading' ? <SectionSkeleton label="Carregando o backup" /> : null}
      {state === 'error' ? (
        <SectionError message="Não deu para carregar o estado do backup." onRetry={onRetry} />
      ) : null}
      {state === 'ready' ? (
        <>
          <FolderRow folderPath={folderPath} {...folder} />
          {lastBackupLine ? <OkLine>{lastBackupLine}</OkLine> : null}
          {nextBackupLine ? <FineNote icon="clock">{nextBackupLine}</FineNote> : null}
          {errorLine ? <FineNote icon="warning">{errorLine}</FineNote> : null}
          {safetyCopy ? (
            <OkLine>Backup restaurado. A cópia de segurança ficou em {safetyCopy}.</OkLine>
          ) : null}
          {actionError ? (
            <p role="alert" className="text-meta text-loss">
              {actionError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-s12">
            <Button
              variant="secondary"
              icon="database"
              loading={isRunning}
              loadingLabel="Fazendo backup..."
              isDisabled={folderPath === null}
              onPress={onRunBackup}
            >
              Fazer backup agora
            </Button>
            <Button
              variant="tertiary"
              icon="history"
              isDisabled={folderPath === null}
              onPress={restore.onOpen}
            >
              Restaurar um backup
            </Button>
          </div>
          <RestoreDialogs {...restore} />
        </>
      ) : null}
    </Section>
  );
}
