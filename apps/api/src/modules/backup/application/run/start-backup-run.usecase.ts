import type { BackupRun } from '@fincheck/shared/backup/backup-run/backup-run.type.ts';

import type { BackupCatalog } from '#/modules/backup/application/file/backup-catalog.service.ts';
import type { GetBackupSettingsQuery } from '#/modules/backup/application/folder/get-backup-settings.query.ts';
import type { BackgroundRunner } from '#/modules/backup/application/run/background-runner.type.ts';
import type { BackupActivity } from '#/modules/backup/application/run/backup-activity.service.ts';
import type { BackupWriter } from '#/modules/backup/application/run/backup-writer.service.ts';
import { BackupFileName } from '#/modules/backup/domain/file/backup-file-name.value-object.ts';
import { BackupFolderNotSetError } from '#/modules/backup/domain/folder/backup-folder-not-set.error.ts';
import { BackupInProgressError } from '#/modules/backup/domain/run/backup-in-progress.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// "Fazer backup agora": takes the turn, picks the name and answers at once; the copy runs after the
// answer (`BackgroundRunner`) and the front reads `GET /backup` until `running` is false.
export class StartBackupRunUseCase {
  private readonly settings: GetBackupSettingsQuery;
  private readonly catalog: BackupCatalog;
  private readonly activity: BackupActivity;
  private readonly writer: BackupWriter;
  private readonly runInBackground: BackgroundRunner;
  private readonly clock: Clock;

  constructor(
    settings: GetBackupSettingsQuery,
    catalog: BackupCatalog,
    activity: BackupActivity,
    writer: BackupWriter,
    runInBackground: BackgroundRunner,
    clock: Clock,
  ) {
    this.settings = settings;
    this.catalog = catalog;
    this.activity = activity;
    this.writer = writer;
    this.runInBackground = runInBackground;
    this.clock = clock;
  }

  async execute(): Promise<StartBackupRunUseCase.Output> {
    const settings = await this.settings.execute();
    if (!settings) throw new BackupFolderNotSetError();
    if (!this.activity.tryStart('backup')) throw new BackupInProgressError();

    let fileName: BackupFileName;
    const startedAt = this.clock.now();
    try {
      const taken = new Set(
        (await this.catalog.listOrEmpty(settings.folderPath)).map((entry) => entry.fileName),
      );
      fileName = BackupFileName.firstFree(startedAt, taken);
    } catch (error) {
      this.activity.finish();
      throw error;
    }

    this.runInBackground(async () => {
      try {
        await this.writer.write(settings.folderPath, fileName.value);
      } finally {
        this.activity.finish();
      }
    });

    return { fileName: fileName.value, startedAt };
  }
}

export namespace StartBackupRunUseCase {
  export type Output = BackupRun.Dto;
}
