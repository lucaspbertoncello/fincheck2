import { join } from 'node:path';

import type { BackupRestore } from '@fincheck/shared/backup/backup-restore/backup-restore.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BackupCatalog } from '#/modules/backup/application/file/backup-catalog.service.ts';
import type { GetBackupSettingsQuery } from '#/modules/backup/application/folder/get-backup-settings.query.ts';
import type { BackupFileInspector } from '#/modules/backup/application/restore/backup-file-inspector.interface.ts';
import type { DatabaseRestorer } from '#/modules/backup/application/restore/database-restorer.interface.ts';
import type { BackgroundRunner } from '#/modules/backup/application/run/background-runner.type.ts';
import type { BackupActivity } from '#/modules/backup/application/run/backup-activity.service.ts';
import type { BackupWriter } from '#/modules/backup/application/run/backup-writer.service.ts';
import { assessBackupFile } from '#/modules/backup/domain/file/assess-backup-file.util.ts';
import { BackupFileInvalidError } from '#/modules/backup/domain/file/backup-file-invalid.error.ts';
import { BackupFileName } from '#/modules/backup/domain/file/backup-file-name.value-object.ts';
import { BackupFileNotFoundError } from '#/modules/backup/domain/file/backup-file-not-found.error.ts';
import { BackupFolderInvalidError } from '#/modules/backup/domain/folder/backup-folder-invalid.error.ts';
import { BackupInProgressError } from '#/modules/backup/domain/run/backup-in-progress.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { MaintenanceGate } from '#/shared/maintenance/maintenance-gate.service.ts';

const MAX_SAFETY_COPY_ATTEMPTS = 3;

// Restoring a backup (BR-BKP-002), the delicate part of the context. In this order, and nothing is
// swapped if a step before the swap fails:
//   1. takes the turn of `BackupActivity` and closes the gate (the tasks of the clock hold back and
//      `GET /health` stops saying `ok`);
//   2. copies the chosen file next to the live database, opens the copy read only, runs
//      `integrity_check` and checks it is a Fincheck database no newer than this app;
//   3. makes the safety copy of the live database in the folder, with a name of the same pattern;
//   4. applies the pending migrations to the copy;
//   5. answers 202, and then swaps: the connection closes, the file is replaced, it opens again,
//      and the current folder is written into the restored database (the file may point to another
//      folder, and the folder must not go back in time with the data). The gate opens at the end.
export class RestoreBackupUseCase {
  private readonly settings: GetBackupSettingsQuery;
  private readonly catalog: BackupCatalog;
  private readonly activity: BackupActivity;
  private readonly gate: MaintenanceGate;
  private readonly inspector: BackupFileInspector;
  private readonly restorer: DatabaseRestorer;
  private readonly writer: BackupWriter;
  private readonly listMigrationNames: () => Promise<string[]>;
  private readonly db: Kysely<Database>;
  private readonly runInBackground: BackgroundRunner;
  private readonly clock: Clock;
  private readonly log: (message: string) => void;

  constructor(deps: {
    settings: GetBackupSettingsQuery;
    catalog: BackupCatalog;
    activity: BackupActivity;
    gate: MaintenanceGate;
    inspector: BackupFileInspector;
    restorer: DatabaseRestorer;
    writer: BackupWriter;
    listMigrationNames: () => Promise<string[]>;
    db: Kysely<Database>;
    runInBackground: BackgroundRunner;
    clock: Clock;
    log?: (message: string) => void;
  }) {
    this.settings = deps.settings;
    this.catalog = deps.catalog;
    this.activity = deps.activity;
    this.gate = deps.gate;
    this.inspector = deps.inspector;
    this.restorer = deps.restorer;
    this.writer = deps.writer;
    this.listMigrationNames = deps.listMigrationNames;
    this.db = deps.db;
    this.runInBackground = deps.runInBackground;
    this.clock = deps.clock;
    this.log = deps.log ?? ((message) => console.error(message));
  }

  async execute(input: RestoreBackupUseCase.Input): Promise<RestoreBackupUseCase.Output> {
    const settings = await this.settings.execute();
    if (!settings) throw new BackupFileNotFoundError();
    if (!this.activity.tryStart('restore')) throw new BackupInProgressError();
    this.gate.begin();

    const folderPath = settings.folderPath;
    let staged: string | null = null;
    let safetyCopy: BackupFileName;
    try {
      const entries = await this.catalog.list(folderPath);
      if (!entries.some((entry) => entry.fileName === input.fileName)) {
        throw new BackupFileNotFoundError();
      }

      try {
        staged = await this.restorer.stage(join(folderPath, input.fileName));
      } catch (error) {
        // The file went away between the listing and the copy.
        const code =
          typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
        throw code === 'ENOENT' ? new BackupFileNotFoundError() : error;
      }
      const facts = await this.inspector.inspect(staged);
      const reason = assessBackupFile(facts, await this.listMigrationNames());
      if (reason) throw new BackupFileInvalidError(reason);

      safetyCopy = BackupFileName.firstFree(
        this.clock.now(),
        new Set(entries.map((entry) => entry.fileName)),
      );
      // A write that lands after the safety copy and before the swap would be lost (it is neither in
      // the copy nor in the restored file). So the copy is made, then the database is made to refuse
      // writes, and the copy stands only if no write got in between (the count of changes of the one
      // connection did not move); if one did, it is made again. From then on a write fails loudly
      // until the swap (the swap opens a writable handle again).
      await this.copyWithWritesFrozen(folderPath, safetyCopy.value);

      await this.restorer.migrate(staged);
    } catch (error) {
      if (staged !== null) await this.restorer.discard(staged).catch(() => undefined);
      await this.restorer.unfreezeWrites().catch(() => undefined);
      this.gate.end();
      this.activity.finish();
      throw error;
    }

    const stagedFile = staged;
    this.runInBackground(async () => {
      let keepGateClosed = false;
      try {
        try {
          await this.restorer.replaceWith(stagedFile);
        } catch (error) {
          keepGateClosed = await this.handleFailedSwap(error, stagedFile);

          return;
        }
        try {
          await this.rewriteFolder(folderPath);
        } catch (error) {
          this.log(
            `backup restore: the folder was not written again: ${RestoreBackupUseCase.describe(error)}`,
          );
        }
      } finally {
        if (!keepGateClosed) this.gate.end();
        this.activity.finish();
      }
    });

    return { safetyCopyFileName: safetyCopy.value };
  }

  private async copyWithWritesFrozen(folderPath: string, fileName: string): Promise<void> {
    for (let attempt = 1; attempt <= MAX_SAFETY_COPY_ATTEMPTS; attempt += 1) {
      const changesBefore = await this.restorer.changeCount();
      try {
        await this.writer.copy(folderPath, fileName);
      } catch {
        throw new BackupFolderInvalidError('not_writable');
      }
      await this.restorer.freezeWrites();
      if ((await this.restorer.changeCount()) === changesBefore) return;
      await this.restorer.unfreezeWrites();
    }
    // The database kept changing under the copy: nothing was swapped; try again in a moment.
    throw new BackupInProgressError();
  }

  // The swap failed after the 202. Two cases. (1) The old database is back and open: it is made
  // writable again, the failure is kept in `lastError` as `RESTORE_FAILED` (the front reads it) and
  // the gate opens. (2) Nothing could be put in place: the API must not serve an empty database, so
  // the gate stays closed (`GET /health` is not ok, the tasks hold back, every query fails), the old
  // database is kept under a name nothing deletes and the log says where it is. Returns whether the
  // gate must stay closed.
  private async handleFailedSwap(error: unknown, stagedFile: string): Promise<boolean> {
    this.log(`backup restore: the swap failed: ${RestoreBackupUseCase.describe(error)}`);
    await this.restorer.discard(stagedFile).catch(() => undefined);

    if (this.restorer.isDatabaseOpen()) {
      try {
        await this.restorer.unfreezeWrites();
        await this.db
          .updateTable('backup_settings')
          .set({ last_error_at: this.clock.now(), last_error_code: 'RESTORE_FAILED' })
          .where('id', '=', 1)
          .execute();
      } catch (recordError) {
        this.log(
          `backup restore: the failure was not recorded: ${RestoreBackupUseCase.describe(recordError)}`,
        );
      }

      return false;
    }

    const preserved = await this.restorer.preserveReplaced().catch(() => null);
    this.log(
      preserved
        ? `backup restore: NO DATABASE IS OPEN. The old database is kept at ${preserved}; the API stays out of service. Put that file back as the database file and restart.`
        : 'backup restore: NO DATABASE IS OPEN and no old database was found beside the file. The API stays out of service; use the newest backup or safety copy in the backup folder.',
    );

    return true;
  }

  // The restored database keeps the folder that is chosen now, and the failure of the last backup
  // (which belongs to the timeline that was left) is cleared.
  private async rewriteFolder(folderPath: string): Promise<void> {
    const now = this.clock.now();
    await this.db
      .insertInto('backup_settings')
      .values({
        id: 1,
        folder_path: folderPath,
        last_error_at: null,
        last_error_code: null,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          folder_path: folderPath,
          last_error_at: null,
          last_error_code: null,
          updated_at: now,
        }),
      )
      .execute();
  }

  private static describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export namespace RestoreBackupUseCase {
  export type Input = BackupRestore.Request;
  export type Output = BackupRestore.Response;
}
