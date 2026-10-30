import { updateBackupSettingsRequestSchema } from '@fincheck/shared/backup/backup-settings/backup-settings.schema.ts';
import { useEffect, useState } from 'react';

import { waitForHealthy } from '#/domain/health/health/services/wait-for-healthy.service.ts';
import { useBackupModel } from '#/features/settings/settings/backup/backup.model.ts';
import { BackupView } from '#/features/settings/settings/backup/backup.view.tsx';
import type { BackupFileItem } from '#/features/settings/settings/backup/types/backup-file-item.type.ts';
import { describeBackupError } from '#/features/settings/settings/backup/utils/describe-backup-error.util.ts';
import { formatBackupDay } from '#/features/settings/settings/backup/utils/format-backup-day.util.ts';
import { formatBackupMoment } from '#/features/settings/settings/backup/utils/format-backup-moment.util.ts';
import { formatFileSize } from '#/features/settings/settings/backup/utils/format-file-size.util.ts';
import { focusFirstInvalid } from '#/features/settings/settings/utils/focus-first-invalid.util.ts';
import { getActionErrorMessage } from '#/features/settings/settings/utils/get-action-error-message.util.ts';
import { reloadApp } from '#/shared/utils/reload-app.util.ts';

type RestoreStep = 'closed' | 'choose' | 'confirm';

const FOLDER_FORMAT_ERROR =
  'Use o caminho completo da pasta, como D:\\Backups\\Fincheck ou \\\\servidor\\backups.';

/** Adapts the backup status, the folder form and the restore dialogs to the section. */
export function BackupViewModel() {
  const [restoreStep, setRestoreStep] = useState<RestoreStep>('closed');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [safetyCopy, setSafetyCopy] = useState<string | null>(null);

  const { status, files, startRun, updateSettings, restore } = useBackupModel({
    isRestoreOpen: restoreStep !== 'closed',
  });

  useEffect(() => {
    if (folderError) focusFirstInvalid();
  }, [folderError]);

  const now = new Date();
  const data = status.data;
  const folderPath = data?.folderPath ?? null;

  const fileItems: BackupFileItem[] = (files.data?.items ?? []).map((file) => ({
    fileName: file.fileName,
    label: `${formatBackupMoment(file.createdAt, now)} · ${formatFileSize(file.sizeBytes)}`,
    day: formatBackupDay(file.createdAt),
  }));
  const selectedItem = fileItems.find((item) => item.fileName === selectedFile) ?? null;

  function startEditingFolder() {
    setFolderDraft(folderPath ?? '');
    setFolderError(null);
    setIsEditingFolder(true);
  }

  function saveFolder() {
    const parsed = updateBackupSettingsRequestSchema.safeParse({ folderPath: folderDraft });
    if (!parsed.success) {
      setFolderError(FOLDER_FORMAT_ERROR);
      return;
    }

    setFolderError(null);
    updateSettings.mutate(parsed.data, {
      onSuccess: () => setIsEditingFolder(false),
      onError: (error) =>
        setFolderError(getActionErrorMessage(error, 'Não deu para usar essa pasta.')),
    });
  }

  function runBackup() {
    setActionError(null);
    setSafetyCopy(null);
    startRun.mutate(undefined, {
      onError: (error) =>
        setActionError(getActionErrorMessage(error, 'Não deu para iniciar o backup.')),
    });
  }

  function closeRestore() {
    setRestoreStep('closed');
    setSelectedFile(null);
    setRestoreError(null);
  }

  function confirmRestore() {
    if (!selectedFile) return;
    setRestoreError(null);
    restore.mutate(
      { fileName: selectedFile },
      {
        onSuccess: (answer) => {
          setSafetyCopy(answer.safetyCopyFileName);
          closeRestore();
          // The API reopens by itself: wait for /health, then reload to read the restored data.
          void waitForHealthy().then((isBack) => {
            if (isBack) reloadApp();
          });
        },
        onError: (error) => {
          setRestoreError(getActionErrorMessage(error, 'Não deu para restaurar esse backup.'));
          setRestoreStep('choose');
        },
      },
    );
  }

  return (
    <BackupView
      state={status.isPending ? 'loading' : status.isError ? 'error' : 'ready'}
      onRetry={() => void status.refetch()}
      folderPath={folderPath}
      lastBackupLine={
        data?.lastBackup
          ? `Último backup ${formatBackupMoment(data.lastBackup.createdAt, now)}, ${formatFileSize(data.lastBackup.sizeBytes)}. Um por dia, os últimos ${data.keepCount} guardados.`
          : folderPath
            ? `Nenhum backup ainda. Um por dia, os últimos ${data?.keepCount ?? 30} ficam guardados.`
            : null
      }
      nextBackupLine={
        data?.nextScheduledAt
          ? `Próximo backup ${formatBackupMoment(data.nextScheduledAt, now)}.`
          : null
      }
      errorLine={data?.lastError ? describeBackupError(data.lastError.code) : null}
      actionError={actionError}
      safetyCopy={safetyCopy}
      isRunning={startRun.isPending || (data?.running ?? false)}
      onRunBackup={runBackup}
      folder={{
        isEditing: isEditingFolder,
        draft: folderDraft,
        error: folderError,
        isSaving: updateSettings.isPending,
        onStartEditing: startEditingFolder,
        onDraftChange: setFolderDraft,
        onSave: saveFolder,
        onCancel: () => setIsEditingFolder(false),
      }}
      restore={{
        step: restoreStep,
        isFilesLoading: files.isPending,
        isFilesError: files.isError,
        files: fileItems,
        selectedFile,
        selectedDay: selectedItem?.day ?? null,
        error: restoreError,
        isRestoring: restore.isPending,
        onOpen: () => {
          setRestoreError(null);
          setSafetyCopy(null);
          setRestoreStep('choose');
        },
        onSelectFile: setSelectedFile,
        onContinue: () => setRestoreStep('confirm'),
        onBack: () => setRestoreStep('choose'),
        onClose: closeRestore,
        onConfirm: confirmRestore,
        onRetryFiles: () => void files.refetch(),
      }}
    />
  );
}
