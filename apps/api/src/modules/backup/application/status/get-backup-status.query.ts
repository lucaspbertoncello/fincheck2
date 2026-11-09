import { BACKUP_KEEP_COUNT } from '@fincheck/shared/backup/backup-file/backup-file.constant.ts';
import type { BackupStatus } from '@fincheck/shared/backup/backup-status/backup-status.type.ts';

import type { BackupCatalog } from '#/modules/backup/application/file/backup-catalog.service.ts';
import type { GetBackupSettingsQuery } from '#/modules/backup/application/folder/get-backup-settings.query.ts';
import type { BackupActivity } from '#/modules/backup/application/run/backup-activity.service.ts';
import { computeNextBackupAt } from '#/modules/backup/domain/run/compute-next-backup-at.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// `GET /backup` (and the answer of `PUT /backup/settings`): the folder, the newest file in it, when
// the daily task runs next, whether something is running and the last failure. The last backup is
// read from the folder, not from the database; a folder that does not open shows no backup, with no
// error here (the failure of the last attempt is in `lastError`).
export class GetBackupStatusQuery {
  private readonly settings: GetBackupSettingsQuery;
  private readonly catalog: BackupCatalog;
  private readonly activity: BackupActivity;
  private readonly clock: Clock;

  constructor(
    settings: GetBackupSettingsQuery,
    catalog: BackupCatalog,
    activity: BackupActivity,
    clock: Clock,
  ) {
    this.settings = settings;
    this.catalog = catalog;
    this.activity = activity;
    this.clock = clock;
  }

  async execute(): Promise<GetBackupStatusQuery.Output> {
    const settings = await this.settings.execute();
    const running = this.activity.isRunning();
    if (!settings) {
      return {
        folderPath: null,
        lastBackup: null,
        keepCount: BACKUP_KEEP_COUNT,
        nextScheduledAt: null,
        running,
        lastError: null,
      };
    }

    const backups = await this.catalog.listOrEmpty(settings.folderPath);
    const newest = backups[0];
    const today = this.clock.today();

    return {
      folderPath: settings.folderPath,
      lastBackup: newest
        ? { fileName: newest.fileName, createdAt: newest.createdAt, sizeBytes: newest.sizeBytes }
        : null,
      keepCount: BACKUP_KEEP_COUNT,
      nextScheduledAt: computeNextBackupAt({
        now: this.clock.now(),
        today,
        hasBackupToday: backups.some((backup) => backup.day === today.value),
        lastErrorAt: settings.lastError?.at ?? null,
      }),
      running,
      lastError: settings.lastError,
    };
  }
}

export namespace GetBackupStatusQuery {
  export type Output = BackupStatus.Dto;
}
