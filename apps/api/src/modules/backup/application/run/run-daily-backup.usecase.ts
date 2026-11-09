import type { BackupCatalog } from '#/modules/backup/application/file/backup-catalog.service.ts';
import type { GetBackupSettingsQuery } from '#/modules/backup/application/folder/get-backup-settings.query.ts';
import type { BackupActivity } from '#/modules/backup/application/run/backup-activity.service.ts';
import type { BackupWriter } from '#/modules/backup/application/run/backup-writer.service.ts';
import { BackupFileName } from '#/modules/backup/domain/file/backup-file-name.value-object.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The daily backup (the schedule calls it at 03:00 and when the API starts): the same procedure as
// the manual one, once per day. Whether today already has its file is decided by the date in the
// names of the folder. Without a folder it does nothing and records no error; if a backup or a
// restore is running it leaves it be. It waits for the copy, and a failure is kept in `lastError`.
export class RunDailyBackupUseCase {
  private readonly settings: GetBackupSettingsQuery;
  private readonly catalog: BackupCatalog;
  private readonly activity: BackupActivity;
  private readonly writer: BackupWriter;
  private readonly clock: Clock;

  constructor(
    settings: GetBackupSettingsQuery,
    catalog: BackupCatalog,
    activity: BackupActivity,
    writer: BackupWriter,
    clock: Clock,
  ) {
    this.settings = settings;
    this.catalog = catalog;
    this.activity = activity;
    this.writer = writer;
    this.clock = clock;
  }

  async execute(): Promise<void> {
    const settings = await this.settings.execute();
    if (!settings) return;
    if (!this.activity.tryStart('backup')) return;

    try {
      const backups = await this.catalog.listOrEmpty(settings.folderPath);
      if (backups.some((backup) => backup.day === this.clock.today().value)) return;

      const taken = new Set(backups.map((backup) => backup.fileName));
      await this.writer.write(
        settings.folderPath,
        BackupFileName.firstFree(this.clock.now(), taken).value,
      );
    } finally {
      this.activity.finish();
    }
  }
}
