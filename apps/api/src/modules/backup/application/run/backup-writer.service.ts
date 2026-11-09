import { join } from 'node:path';

import { BACKUP_KEEP_COUNT } from '@fincheck/shared/backup/backup-file/backup-file.constant.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BackupFolder } from '#/modules/backup/application/folder/backup-folder.interface.ts';
import type { BackupFileInspector } from '#/modules/backup/application/restore/backup-file-inspector.interface.ts';
import type { DatabaseSnapshot } from '#/modules/backup/application/run/database-snapshot.interface.ts';
import { selectBackupsToDelete } from '#/modules/backup/domain/file/select-backups-to-delete.util.ts';
import { classifyBackupFailure } from '#/modules/backup/domain/run/classify-backup-failure.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// Writes a backup file into the folder: the copy goes to a temporary name and is renamed at the end,
// so the list never sees a file by half. The caller holds the turn of `BackupActivity`.
export class BackupWriter {
  private readonly folder: BackupFolder;
  private readonly snapshot: DatabaseSnapshot;
  private readonly inspector: BackupFileInspector;
  private readonly db: Kysely<Database>;
  private readonly clock: Clock;
  private readonly log: (message: string) => void;

  constructor(
    folder: BackupFolder,
    snapshot: DatabaseSnapshot,
    inspector: BackupFileInspector,
    db: Kysely<Database>,
    clock: Clock,
    log: (message: string) => void = (message) => console.error(message),
  ) {
    this.folder = folder;
    this.snapshot = snapshot;
    this.inspector = inspector;
    this.db = db;
    this.clock = clock;
    this.log = log;
  }

  // The copy alone, without rotation and without touching `lastError`: it throws when it fails and
  // leaves no temporary file behind. The safety copy of a restore is made with it.
  async copy(folderPath: string, fileName: string): Promise<void> {
    const temporary = `${fileName}.tmp`;
    try {
      await this.folder.remove(folderPath, temporary);
      await this.snapshot.copyTo(join(folderPath, temporary));
      // `VACUUM INTO` does not promise the bytes are on the disk after a power cut: look at the file
      // before it takes its final name, so a bad one is never taken for a backup (and the rotation
      // never deletes good ones to keep it).
      const facts = await this.inspector.inspect(join(folderPath, temporary));
      if (!facts.readable || !facts.integrityOk) {
        throw new Error('The copy of the database failed its integrity check');
      }
      await this.folder.rename(folderPath, temporary, fileName);
    } catch (error) {
      await this.folder.remove(folderPath, temporary).catch(() => undefined);
      throw error;
    }
  }

  // A whole backup (BR-BKP-001): the copy, then the rotation to the 30 newest, then `lastError`
  // cleared. A failure is kept in `lastError` and never thrown: the task has nobody to throw to.
  async write(folderPath: string, fileName: string): Promise<void> {
    try {
      await this.copy(folderPath, fileName);
    } catch (error) {
      this.log(`backup: ${error instanceof Error ? error.message : String(error)}`);
      await this.record(classifyBackupFailure(error));

      return;
    }
    await this.rotate(folderPath, fileName);
    await this.record(null);
  }

  // Failing to delete an old file does not fail the backup that was just made.
  private async rotate(folderPath: string, justWritten: string): Promise<void> {
    try {
      const entries = await this.folder.listBackups(folderPath);
      const names = selectBackupsToDelete(
        entries.map((entry) => entry.fileName),
        BACKUP_KEEP_COUNT,
        justWritten,
      );
      for (const name of names) {
        await this.folder.remove(folderPath, name);
      }
    } catch (error) {
      this.log(`backup rotation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async record(code: string | null): Promise<void> {
    try {
      await this.db
        .updateTable('backup_settings')
        .set(
          code === null
            ? { last_error_at: null, last_error_code: null }
            : { last_error_at: this.clock.now(), last_error_code: code },
        )
        .where('id', '=', 1)
        .execute();
    } catch (error) {
      this.log(`backup result: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
