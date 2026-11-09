import type { BackupFile } from '@fincheck/shared/backup/backup-file/backup-file.type.ts';
import type { ValueTrendPoint } from '@fincheck/ui';

import { BYTES_PER_MEGABYTE } from '#/features/settings/settings/backup/constants/bytes-per-megabyte.constant.ts';
import { formatBackupDay } from '#/features/settings/settings/backup/utils/format-backup-day.util.ts';
import { formatBackupMoment } from '#/features/settings/settings/backup/utils/format-backup-moment.util.ts';
import { hasSharedMinute } from '#/features/settings/settings/backup/utils/has-shared-minute.util.ts';
import { capitalize } from '#/shared/utils/text/capitalize.util.ts';

/**
 * The points of the size chart: the last `limit` backups, oldest first, each one with its size in
 * megabytes. The list comes newest first, as the API sends it.
 */
export function buildSizePoints(
  files: readonly BackupFile.Dto[],
  now: Date,
  limit: number,
): ValueTrendPoint[] {
  return files
    .slice(0, limit)
    .toReversed()
    .map((file) => ({
      key: file.createdAt,
      label: formatBackupDay(file.createdAt),
      fullLabel: capitalize(formatBackupMoment(file.createdAt, now, hasSharedMinute(file, files))),
      value: file.sizeBytes / BYTES_PER_MEGABYTE,
    }));
}
