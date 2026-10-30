import { useState } from 'react';

import { useBackupFiles } from '#/domain/backup/backup-file/hooks/use-backup-files.hook.ts';
import { useRestoreBackup } from '#/domain/backup/backup-restore/hooks/use-restore-backup.hook.ts';
import { useStartBackupRun } from '#/domain/backup/backup-run/hooks/use-start-backup-run.hook.ts';
import { useUpdateBackupSettings } from '#/domain/backup/backup-settings/hooks/use-update-backup-settings.hook.ts';
import { useBackupStatus } from '#/domain/backup/backup-status/hooks/use-backup-status.hook.ts';

const POLL_MS = 1000;

/**
 * What the "Backup" section reads and changes. The status is polled while a backup runs, and the
 * list of files is read only while the restore dialog is open.
 */
export function useBackupModel({ isRestoreOpen }: { isRestoreOpen: boolean }) {
  const [isWatching, setIsWatching] = useState(false);
  const status = useBackupStatus({ refetchInterval: isWatching ? POLL_MS : false });
  const files = useBackupFiles({ enabled: isRestoreOpen });
  const startRun = useStartBackupRun();
  const updateSettings = useUpdateBackupSettings();
  const restore = useRestoreBackup();

  const isRunning = status.data?.running ?? false;
  // Polls only while the API says a backup runs (state adjusted during render, no effect).
  if (isWatching !== isRunning) setIsWatching(isRunning);

  return { status, files, startRun, updateSettings, restore };
}
