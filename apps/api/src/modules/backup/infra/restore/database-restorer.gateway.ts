import { existsSync } from 'node:fs';
import { copyFile, rm } from 'node:fs/promises';

import { sql } from 'kysely';

import { migrateToLatest } from '#/database/migrate-to-latest.util.ts';
import type { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';
import { createSqliteClient } from '#/database/sqlite.client.ts';
import type { DatabaseRestorer } from '#/modules/backup/application/restore/database-restorer.interface.ts';
import { renameWithRetry } from '#/modules/backup/infra/restore/rename-with-retry.util.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

// The files of the live database during a restore, over `node:fs` and the replaceable connection.
// The staged copy sits next to the live file, on the same volume, so the final step is a rename.
export class ReplaceableDatabaseRestorer implements DatabaseRestorer {
  private readonly db: ReplaceableDatabase;

  constructor(db: ReplaceableDatabase) {
    this.db = db;
  }

  async stage(backupFile: string): Promise<string> {
    const staged = `${this.db.file}.restoring`;
    await ReplaceableDatabaseRestorer.removeWithLogs(staged);
    try {
      await copyFile(backupFile, staged);
    } catch (error) {
      // A partial copy (full disk, file gone): nobody else knows the path to clean.
      await ReplaceableDatabaseRestorer.removeWithLogs(staged);
      throw error;
    }

    return staged;
  }

  async changeCount(): Promise<number> {
    const { rows } = await sql<{ n: number }>`select total_changes() as n`.execute(this.db);

    return Number(rows[0]?.n ?? 0);
  }

  async freezeWrites(): Promise<void> {
    await this.db.setWritesFrozen(true);
  }

  async unfreezeWrites(): Promise<void> {
    if (this.db.isOpen) await this.db.setWritesFrozen(false);
  }

  isDatabaseOpen(): boolean {
    return this.db.isOpen;
  }

  async migrate(stagedFile: string): Promise<void> {
    const staged = createSqliteClient(stagedFile);
    try {
      await migrateToLatest(staged);
    } finally {
      await staged.destroy();
    }
  }

  async discard(stagedFile: string): Promise<void> {
    await ReplaceableDatabaseRestorer.removeWithLogs(stagedFile);
  }

  async replaceWith(stagedFile: string): Promise<void> {
    const live = this.db.file;
    const replaced = `${live}.replaced`;
    // The old `.replaced` is only deleted while the live file is in place; with no live file it may
    // be the only copy of the data (a swap that died or failed before).
    if (!existsSync(live)) throw new Error(`The database file is missing: ${live}`);

    await this.db.replaceFile(async () => {
      // `replaceFile` closed the handle and removed the log of the live file, so only the file moves.
      await ReplaceableDatabaseRestorer.removeWithLogs(replaced);
      await renameWithRetry(live, replaced);
      const putBack = async () => {
        await ReplaceableDatabaseRestorer.removeWithLogs(live);
        await renameWithRetry(replaced, live);
      };
      try {
        await rm(`${stagedFile}-wal`, { force: true });
        await rm(`${stagedFile}-shm`, { force: true });
        await renameWithRetry(stagedFile, live);
      } catch (error) {
        await putBack();
        throw error;
      }

      return putBack;
    });

    await ReplaceableDatabaseRestorer.removeWithLogs(replaced);
  }

  // After a swap that failed twice: the old database sits in `<file>.replaced` and there is no file
  // in its place. It gets a name nothing deletes (`recoverInterruptedSwap` brings it back on the
  // next start) and the path is returned; null when there is nothing to keep.
  async preserveReplaced(): Promise<string | null> {
    const replaced = `${this.db.file}.replaced`;
    if (!existsSync(replaced)) return null;
    const preserved = `${this.db.file}.preserved-${generateId()}`;
    await renameWithRetry(replaced, preserved);

    return preserved;
  }

  private static async removeWithLogs(file: string): Promise<void> {
    await rm(file, { force: true });
    await rm(`${file}-wal`, { force: true });
    await rm(`${file}-shm`, { force: true });
  }
}
