import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import BetterSqlite3 from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMigrator } from '#/database/create-migrator.util.ts';
import { listMigrationNames } from '#/database/list-migration-names.util.ts';
import { createSqliteClient } from '#/database/sqlite.client.ts';
import { createBackupTestWorld } from '#tests/support/backup/backup/create-backup-test-world.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';

describe('POST /backup/restore', () => {
  let world: Awaited<ReturnType<typeof createBackupTestWorld>>;

  beforeEach(async () => {
    world = await createBackupTestWorld();
  });

  afterEach(async () => {
    await world.destroy();
  });

  const tagNames = async () =>
    (await world.database.db.selectFrom('tags').select('name').orderBy('name').execute()).map(
      (row) => row.name,
    );
  const folderFiles = () => readdirSync(world.folder).sort();
  const dataFiles = () =>
    readdirSync(dirname(world.database.file))
      .filter((name) => !name.endsWith('-wal') && !name.endsWith('-shm'))
      .sort();
  const readOnly = (file: string) => new BetterSqlite3(file, { readonly: true });

  // A backup of the database as it is now. Returns the name of the file.
  async function makeBackup(): Promise<string> {
    const { body } = await world.post('/backup/runs');
    await world.runPending();

    return (body as { fileName: string }).fileName;
  }

  async function status() {
    return backupStatusDtoSchema.parse((await world.get('/backup')).body);
  }

  // The state the app has to be in after a restore that did not happen: gate open, nothing running,
  // nothing left over next to the database.
  async function expectQuiet() {
    expect(world.gate.isActive()).toBe(false);
    expect((await status()).running).toBe(false);
    expect(dataFiles()).toEqual(['test.db']);
  }

  describe('a valid backup', () => {
    it('brings the data back, keeps a safety copy of what was there and writes the folder again', async () => {
      await insertTestTag(world.database.db, { name: 'before' });
      await world.choose();
      const backupName = await makeBackup();
      await world.database.db.deleteFrom('tags').execute();
      await insertTestTag(world.database.db, { name: 'after' });
      world.moveTo('2026-11-08T16:00:00.000Z');
      // Written and not folded into the file yet: the log of the old database must not survive.
      expect(statSync(`${world.database.file}-wal`).size).toBeGreaterThan(0);

      const answer = await world.post('/backup/restore', { fileName: backupName });

      expect(answer.status).toBe(202);
      expect(answer.body).toEqual({ safetyCopyFileName: 'fincheck-2026-11-08-130000.db' });
      // Until the swap ends the app says it is not ok, and a second job is refused.
      expect(world.gate.isActive()).toBe(true);
      expect((await world.post('/backup/runs')).status).toBe(409);

      await world.runPending();

      expect(await tagNames()).toEqual(['before']);
      expect(folderFiles()).toEqual([backupName, 'fincheck-2026-11-08-130000.db']);
      const safety = readOnly(join(world.folder, 'fincheck-2026-11-08-130000.db'));
      try {
        expect(safety.prepare('select name from tags').all()).toEqual([{ name: 'after' }]);
      } finally {
        safety.close();
      }
      await expectQuiet();
    });

    it('writes the current folder into the restored database, not the one the file remembers', async () => {
      await world.choose();
      const backupName = await makeBackup();
      const other = join(world.root, 'other');
      mkdirSync(other);
      copyFileSync(join(world.folder, backupName), join(other, backupName));
      await world.choose(other);
      expect(
        (await world.database.db.selectFrom('backup_settings').select('folder_path').execute())[0]
          ?.folder_path,
      ).toBe(other);
      // The file still says `world.folder`.
      const inFile = readOnly(join(other, backupName));
      try {
        expect(inFile.prepare('select folder_path from backup_settings').all()).toEqual([
          { folder_path: world.folder },
        ]);
      } finally {
        inFile.close();
      }

      await world.post('/backup/restore', { fileName: backupName });
      await world.runPending();

      const restored = await status();
      expect(restored.folderPath).toBe(other);
      expect(restored.lastBackup?.fileName).toBe('fincheck-2026-11-08-120001.db');
    });

    it('clears the failure of the last backup, which belongs to the timeline that was left', async () => {
      await world.choose();
      const backupName = await makeBackup();
      await world.database.db
        .updateTable('backup_settings')
        .set({ last_error_at: '2026-11-08T15:30:00.000Z', last_error_code: 'BACKUP_FAILED' })
        .execute();

      await world.post('/backup/restore', { fileName: backupName });
      await world.runPending();

      expect((await status()).lastError).toBeNull();
    });

    it('can be undone: the safety copy is a backup like the others and restores what was there', async () => {
      await insertTestTag(world.database.db, { name: 'before' });
      await world.choose();
      const backupName = await makeBackup();
      await insertTestTag(world.database.db, { name: 'after' });
      world.moveTo('2026-11-08T16:00:00.000Z');
      const first = await world.post('/backup/restore', { fileName: backupName });
      await world.runPending();
      expect(await tagNames()).toEqual(['before']);

      await world.post('/backup/restore', {
        fileName: (first.body as { safetyCopyFileName: string }).safetyCopyFileName,
      });
      await world.runPending();

      expect(await tagNames()).toEqual(['after', 'before']);
      await expectQuiet();
    });

    it('does not repeat a name: the safety copy moves forward if the second is taken', async () => {
      await world.choose();
      const backupName = await makeBackup();
      // Same instant as the backup that was just made.
      const { body } = await world.post('/backup/restore', { fileName: backupName });
      await world.runPending();

      expect(body).toEqual({ safetyCopyFileName: 'fincheck-2026-11-08-120001.db' });
    });

    it('migrates a backup from an older version when it comes in', async () => {
      await world.choose();
      const backupName = await makeBackup();
      const older = createSqliteClient(join(world.folder, backupName));
      try {
        const result = await createMigrator(older).migrateTo(
          '202611061040-create-invoices-recurrences-and-bills',
        );
        expect(result.error).toBeUndefined();
      } finally {
        await older.destroy();
      }
      const oldFile = readOnly(join(world.folder, backupName));
      try {
        expect(
          oldFile.prepare(`select name from sqlite_master where name = 'backup_settings'`).all(),
        ).toEqual([]);
      } finally {
        oldFile.close();
      }

      const answer = await world.post('/backup/restore', { fileName: backupName });
      await world.runPending();

      expect(answer.status).toBe(202);
      const applied = (
        await world.database.db
          .selectFrom('kysely_migration' as never)
          .select('name' as never)
          .execute()
      ).map((row) => (row as { name: string }).name);
      expect(applied.sort()).toEqual(await listMigrationNames());
      // The table of the backup came with the migration and got the folder.
      expect((await status()).folderPath).toBe(world.folder);
    });
  });

  describe('a file that cannot be restored: nothing is swapped', () => {
    async function expectUntouched(before: { tags: string[]; files: string[] }) {
      expect(await tagNames()).toEqual(before.tags);
      expect(folderFiles()).toEqual(before.files);
      await expectQuiet();
    }

    it('refuses a file that is not a database (corrupt)', async () => {
      await insertTestTag(world.database.db, { name: 'live' });
      await world.choose();
      writeFileSync(
        join(world.folder, 'fincheck-2026-11-01-030000.db'),
        'this is not a database'.repeat(200),
      );
      const before = { tags: await tagNames(), files: folderFiles() };

      const answer = await world.post('/backup/restore', {
        fileName: 'fincheck-2026-11-01-030000.db',
      });

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({
        code: 'BACKUP_FILE_INVALID',
        details: { reason: 'corrupt' },
      });
      await expectUntouched(before);
    });

    it('refuses a backup that lost its tail (corrupt)', async () => {
      await insertTestTag(world.database.db, { name: 'live' });
      await world.choose();
      const backupName = await makeBackup();
      const bytes = readFileSync(join(world.folder, backupName));
      writeFileSync(
        join(world.folder, 'fincheck-2026-11-01-030000.db'),
        bytes.subarray(0, Math.floor(bytes.length / 2)),
      );
      const before = { tags: await tagNames(), files: folderFiles() };

      const answer = await world.post('/backup/restore', {
        fileName: 'fincheck-2026-11-01-030000.db',
      });

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({
        code: 'BACKUP_FILE_INVALID',
        details: { reason: 'corrupt' },
      });
      await expectUntouched(before);
    });

    it('refuses a database that is not the Fincheck one (not_fincheck)', async () => {
      await insertTestTag(world.database.db, { name: 'live' });
      await world.choose();
      const stranger = new BetterSqlite3(join(world.folder, 'fincheck-2026-11-01-030000.db'));
      stranger.exec('create table notes (id integer primary key, text text)');
      stranger.close();
      const before = { tags: await tagNames(), files: folderFiles() };

      const answer = await world.post('/backup/restore', {
        fileName: 'fincheck-2026-11-01-030000.db',
      });

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({
        code: 'BACKUP_FILE_INVALID',
        details: { reason: 'not_fincheck' },
      });
      await expectUntouched(before);
    });

    it('refuses an empty database (not_fincheck)', async () => {
      await world.choose();
      writeFileSync(join(world.folder, 'fincheck-2026-11-01-030000.db'), '');

      const answer = await world.post('/backup/restore', {
        fileName: 'fincheck-2026-11-01-030000.db',
      });

      expect(answer.body).toMatchObject({
        code: 'BACKUP_FILE_INVALID',
        details: { reason: 'not_fincheck' },
      });
    });

    it('refuses a backup from a newer version of the app (newer_version)', async () => {
      await insertTestTag(world.database.db, { name: 'live' });
      await world.choose();
      const backupName = await makeBackup();
      const future = new BetterSqlite3(join(world.folder, backupName));
      future
        .prepare('insert into kysely_migration (name, timestamp) values (?, ?)')
        .run('209912312359-something-from-the-future', '2099-12-31T23:59:00.000Z');
      future.close();
      const before = { tags: await tagNames(), files: folderFiles() };

      const answer = await world.post('/backup/restore', { fileName: backupName });

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({
        code: 'BACKUP_FILE_INVALID',
        details: { reason: 'newer_version' },
      });
      await expectUntouched(before);
    });

    it('does not touch the chosen file, not even to read it', async () => {
      await world.choose();
      const backupName = await makeBackup();
      const path = join(world.folder, backupName);
      const bytes = readFileSync(path);

      await world.post('/backup/restore', { fileName: backupName });
      await world.runPending();

      expect(readFileSync(path).equals(bytes)).toBe(true);
      expect(existsSync(`${path}-wal`)).toBe(false);
      expect(existsSync(`${path}-shm`)).toBe(false);
    });

    it('refuses to swap when the safety copy cannot be written (BACKUP_FOLDER_INVALID)', async () => {
      await insertTestTag(world.database.db, { name: 'before' });
      await world.choose();
      const backupName = await makeBackup();
      await insertTestTag(world.database.db, { name: 'after' });
      world.moveTo('2026-11-08T16:00:00.000Z');
      // A folder where the temporary file of the safety copy has to go.
      mkdirSync(join(world.folder, 'fincheck-2026-11-08-130000.db.tmp'));
      const before = { tags: await tagNames(), files: folderFiles() };

      const answer = await world.post('/backup/restore', { fileName: backupName });

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({ code: 'BACKUP_FOLDER_INVALID' });
      await expectUntouched(before);
    });
  });

  describe('what is asked for', () => {
    it('answers 404 when the file is not in the folder', async () => {
      await world.choose();

      const answer = await world.post('/backup/restore', {
        fileName: 'fincheck-2026-11-01-030000.db',
      });

      expect(answer.status).toBe(404);
      expect(answer.body).toMatchObject({ code: 'BACKUP_FILE_NOT_FOUND' });
      await world.runPending();
      expect(world.gate.isActive()).toBe(false);
    });

    it('answers 404 when no folder was chosen', async () => {
      const answer = await world.post('/backup/restore', {
        fileName: 'fincheck-2026-11-01-030000.db',
      });

      expect(answer.status).toBe(404);
      expect(answer.body).toMatchObject({ code: 'BACKUP_FILE_NOT_FOUND' });
    });

    it('answers 422 when the folder vanished', async () => {
      await world.choose();
      rmSync(world.folder, { recursive: true });

      const answer = await world.post('/backup/restore', {
        fileName: 'fincheck-2026-11-01-030000.db',
      });

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({ code: 'BACKUP_FOLDER_INVALID' });
      expect(world.gate.isActive()).toBe(false);
    });

    it('refuses a name that is not a backup name (400), and one that points out of the folder', async () => {
      await world.choose();

      for (const fileName of [
        'whatever.db',
        '..\\fincheck-2026-11-01-030000.db',
        '../fincheck-2026-11-01-030000.db',
      ]) {
        const answer = await world.post('/backup/restore', { fileName });
        expect(answer.status).toBe(400);
        expect(answer.body).toMatchObject({ code: 'VALIDATION_FAILED' });
      }
    });

    it('answers 409 while a backup is running, and a backup is refused while a restore runs', async () => {
      await world.choose();
      const backupName = await makeBackup();
      await world.post('/backup/runs');
      world.moveTo('2026-11-08T16:00:00.000Z');

      const during = await world.post('/backup/restore', { fileName: backupName });
      expect(during.status).toBe(409);
      expect(during.body).toMatchObject({ code: 'BACKUP_IN_PROGRESS' });
      await world.runPending();

      const restore = await world.post('/backup/restore', { fileName: backupName });
      expect(restore.status).toBe(202);
      expect((await status()).running).toBe(true);
      expect((await world.post('/backup/restore', { fileName: backupName })).status).toBe(409);
      expect((await world.post('/backup/runs')).status).toBe(409);
      await world.runPending();
      expect((await status()).running).toBe(false);
    });
  });
});
