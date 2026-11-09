import { BACKUP_KEEP_COUNT } from '@fincheck/shared/backup/backup-file/backup-file.constant.ts';
import { updateBackupSettingsRequestSchema } from '@fincheck/shared/backup/backup-settings/backup-settings.schema.ts';
import { useEffect, useState } from 'react';

import { waitForHealthy } from '#/domain/health/health/services/wait-for-healthy.service.ts';
import { useBackupModel } from '#/features/settings/settings/backup/backup.model.ts';
import { BYTES_PER_MEGABYTE } from '#/features/settings/settings/backup/constants/bytes-per-megabyte.constant.ts';
import { BackupView } from '#/features/settings/settings/backup/backup.view.tsx';
import type { BackupFileItem } from '#/features/settings/settings/backup/types/backup-file-item.type.ts';
import { capitalize } from '#/shared/utils/text/capitalize.util.ts';
import { buildSizePoints } from '#/features/settings/settings/backup/utils/build-size-points.util.ts';
import { describeBackupError } from '#/features/settings/settings/backup/utils/describe-backup-error.util.ts';
import { formatBackupDay } from '#/features/settings/settings/backup/utils/format-backup-day.util.ts';
import { hasSharedMinute } from '#/features/settings/settings/backup/utils/has-shared-minute.util.ts';
import { formatBackupMoment } from '#/features/settings/settings/backup/utils/format-backup-moment.util.ts';
import { formatAxisSize } from '#/features/settings/settings/backup/utils/format-axis-size.util.ts';
import { formatFileSize } from '#/features/settings/settings/backup/utils/format-file-size.util.ts';
import { formatFirstDay } from '#/features/settings/settings/backup/utils/format-first-day.util.ts';
import { focusFirstInvalid } from '#/features/settings/settings/utils/focus-first-invalid.util.ts';
import { getActionErrorMessage } from '#/features/settings/settings/utils/get-action-error-message.util.ts';
import { isApiError } from '#/shared/api/api.error.ts';
import { reloadApp } from '#/shared/utils/reload-app.util.ts';

const FOLDER_FORMAT_ERROR =
  'Use o caminho completo da pasta, como D:\\Backups\\fincheck ou \\\\servidor\\backups.';

/** How many backups the list shows before "Mostrar todos". */
const SHORT_LIST_COUNT = 5;

/** Adapts the database numbers, the backup status, the size chart, the folder form, the list and the restore to the Dados page. */
export function BackupViewModel() {
  const [targetFile, setTargetFile] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [safetyCopy, setSafetyCopy] = useState<string | null>(null);
  // From the 202 of a restore until the API answers again (or the wait gives up): the page does
  // nothing else meanwhile.
  const [isSwapping, setIsSwapping] = useState(false);

  const { status, stats, files, startRun, updateSettings, restore } = useBackupModel();

  useEffect(() => {
    if (folderError) focusFirstInvalid();
  }, [folderError]);

  const now = new Date();
  const data = status.data;
  const folderPath = data?.folderPath ?? null;

  const listedFiles = files.data?.items ?? [];
  const allItems: BackupFileItem[] = listedFiles.map((file, index) => ({
    fileName: file.fileName,
    moment: capitalize(formatBackupMoment(file.createdAt, now, hasSharedMinute(file, listedFiles))),
    size: formatFileSize(file.sizeBytes),
    day: formatBackupDay(file.createdAt),
    isLatest: index === 0,
  }));
  const sizePoints = buildSizePoints(files.data?.items ?? [], now, BACKUP_KEEP_COUNT);
  const numbers = stats.data;
  const target = allItems.find((item) => item.fileName === targetFile) ?? null;

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
        setFolderError(
          // The 400 of a path the API does not accept comes with its own text: the screen always
          // says the same sentence, in Portuguese.
          isApiError(error) && error.code === 'VALIDATION_FAILED'
            ? FOLDER_FORMAT_ERROR
            : getActionErrorMessage(error, 'Não deu para usar essa pasta.'),
        ),
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

  function askRestore(fileName: string) {
    setActionError(null);
    setSafetyCopy(null);
    setTargetFile(fileName);
  }

  function confirmRestore() {
    if (!targetFile) return;
    restore.mutate(
      { fileName: targetFile },
      {
        onSuccess: (answer) => {
          setSafetyCopy(answer.safetyCopyFileName);
          setTargetFile(null);
          setIsSwapping(true);
          // The API swaps the database and reopens by itself: wait for /health, then reload to read
          // the restored data. If the swap failed the old database is back with `RESTORE_FAILED`
          // in the status: stay on the page and say so.
          void waitForHealthy().then(async (isBack) => {
            if (!isBack) {
              setIsSwapping(false);
              setActionError('Não deu para confirmar que o app voltou. Recarregue a página.');
              return;
            }
            const fresh = await status.refetch();
            if (fresh.data?.lastError?.code === 'RESTORE_FAILED') {
              setIsSwapping(false);
              // The failure is already in "Último backup", from the status just read.
              setSafetyCopy(null);
              return;
            }
            reloadApp();
          });
        },
        onError: (error) => {
          setTargetFile(null);
          setActionError(getActionErrorMessage(error, 'Não deu para restaurar esse backup.'));
        },
      },
    );
  }

  return (
    <BackupView
      state={status.isPending ? 'loading' : status.isError ? 'error' : 'ready'}
      onRetry={() => void status.refetch()}
      folderPath={folderPath}
      stats={{
        isLoading: stats.isPending,
        isError: stats.isError,
        onRetry: () => void stats.refetch(),
        figures: numbers
          ? [
              {
                label: 'Tamanho do banco',
                value: formatFileSize(numbers.dbSizeBytes),
                caption: 'Agora, no disco',
              },
              {
                label: 'Transações guardadas',
                value: numbers.transactionCount.toLocaleString('pt-BR'),
                caption: 'Lançadas e importadas',
              },
              {
                label: 'Dados desde',
                value: numbers.firstTransactionOn
                  ? formatFirstDay(numbers.firstTransactionOn)
                  : 'Ainda não há',
                caption: 'A transação mais antiga',
              },
              {
                label: 'Contas e cartões',
                value: String(numbers.accountCount),
                caption: 'Sem as arquivadas',
              },
            ]
          : [],
      }}
      sizeChart={{
        points: sizePoints,
        formatValue: (megabytes: number) => formatFileSize(megabytes * BYTES_PER_MEGABYTE),
        formatAxisValue: formatAxisSize,
      }}
      last={
        data?.lastBackup
          ? {
              moment: capitalize(formatBackupMoment(data.lastBackup.createdAt, now)),
              size: formatFileSize(data.lastBackup.sizeBytes),
            }
          : null
      }
      failure={data?.lastError ? describeBackupError(data.lastError.code) : null}
      nextMoment={
        data?.nextScheduledAt ? capitalize(formatBackupMoment(data.nextScheduledAt, now)) : null
      }
      keepCount={data?.keepCount ?? 30}
      actionError={actionError}
      safetyCopy={safetyCopy}
      isRunning={startRun.isPending || (data?.running ?? false) || isSwapping}
      onRunBackup={runBackup}
      folder={{
        isEditing: isEditingFolder,
        draft: folderDraft,
        error: folderError,
        isSaving: updateSettings.isPending || isSwapping,
        onStartEditing: startEditingFolder,
        onDraftChange: setFolderDraft,
        onSave: saveFolder,
        onCancel: () => setIsEditingFolder(false),
      }}
      files={{
        isLoading: files.isPending && folderPath !== null,
        isError: files.isError,
        items: allItems,
        shortCount: SHORT_LIST_COUNT,
        canExpand: allItems.length > SHORT_LIST_COUNT,
        isExpanded,
        totalCount: allItems.length,
        onToggleExpanded: () => setIsExpanded((current) => !current),
        onRetry: () => void files.refetch(),
      }}
      restore={{
        target,
        isRestoring: restore.isPending || isSwapping,
        onAsk: askRestore,
        onCancel: () => setTargetFile(null),
        onConfirm: confirmRestore,
      }}
    />
  );
}
