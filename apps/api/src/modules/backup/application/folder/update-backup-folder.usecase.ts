import { win32 } from 'node:path';

import type { BackupSettings } from '@fincheck/shared/backup/backup-settings/backup-settings.type.ts';
import type { BackupStatus } from '@fincheck/shared/backup/backup-status/backup-status.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BackupFolder } from '#/modules/backup/application/folder/backup-folder.interface.ts';
import type { GetBackupStatusQuery } from '#/modules/backup/application/status/get-backup-status.query.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// "Trocar pasta" (and choosing the first one): checks the folder on the disk (exists, is a folder,
// the API can write in it) and keeps it in the single row of `backup_settings`. The files of the old
// folder are not moved nor deleted. The failure of the last backup was about the old folder, so it
// is cleared.
export class UpdateBackupFolderUseCase {
  private readonly folder: BackupFolder;
  private readonly db: Kysely<Database>;
  private readonly status: GetBackupStatusQuery;
  private readonly clock: Clock;

  constructor(
    folder: BackupFolder,
    db: Kysely<Database>,
    status: GetBackupStatusQuery,
    clock: Clock,
  ) {
    this.folder = folder;
    this.db = db;
    this.status = status;
    this.clock = clock;
  }

  async execute(input: UpdateBackupFolderUseCase.Input): Promise<UpdateBackupFolderUseCase.Output> {
    const folderPath = UpdateBackupFolderUseCase.normalize(input.folderPath);
    await this.folder.assertUsable(folderPath);
    await this.db
      .insertInto('backup_settings')
      .values({
        id: 1,
        folder_path: folderPath,
        last_error_at: null,
        last_error_code: null,
        updated_at: this.clock.now(),
      })
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          folder_path: folderPath,
          last_error_at: null,
          last_error_code: null,
          updated_at: this.clock.now(),
        }),
      )
      .execute();

    return this.status.execute();
  }

  // `..` and `.` resolved and no trailing backslash (the root `C:\` keeps its own), so the screen
  // shows the path as Windows would.
  private static normalize(folderPath: string): string {
    const normalized = win32.normalize(folderPath);

    return /^[A-Za-z]:\\$/.test(normalized) ? normalized : normalized.replace(/\\+$/, '');
  }
}

export namespace UpdateBackupFolderUseCase {
  export type Input = BackupSettings.UpdateRequest;
  export type Output = BackupStatus.Dto;
}
