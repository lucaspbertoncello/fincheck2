import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { backupFileDtoSchema } from '@fincheck/shared/backup/backup-file/backup-file.schema.ts';
import { backupRunDtoSchema } from '@fincheck/shared/backup/backup-run/backup-run.schema.ts';
import { backupStatsDtoSchema } from '@fincheck/shared/backup/backup-stats/backup-stats.schema.ts';
import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createBackupTestWorld } from '#tests/support/backup/backup/create-backup-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';

describe('backup routes', () => {
  let world: Awaited<ReturnType<typeof createBackupTestWorld>>;

  beforeEach(async () => {
    world = await createBackupTestWorld();
  });

  afterEach(async () => {
    await world.destroy();
  });

  const backupFiles = () => readdirSync(world.folder).sort();
  const touch = (name: string) => writeFileSync(join(world.folder, name), 'x');

  describe('GET /backup', () => {
    it('answers with everything null while no folder was chosen', async () => {
      const { status, body } = await world.get('/backup');

      expect(status).toBe(200);
      expect(backupStatusDtoSchema.parse(body)).toEqual({
        folderPath: null,
        lastBackup: null,
        keepCount: 30,
        nextScheduledAt: null,
        running: false,
        lastError: null,
      });
    });

    it('shows the folder, the newest file (the instant comes from the name) and the next run', async () => {
      touch('fincheck-2026-11-06-030000.db');
      touch('fincheck-2026-11-07-030012.db');
      touch('notes.txt');
      await world.choose();

      const { body } = await world.get('/backup');

      expect(backupStatusDtoSchema.parse(body)).toMatchObject({
        folderPath: world.folder,
        // 03:00:12 in São Paulo is 06:00:12 UTC.
        lastBackup: {
          fileName: 'fincheck-2026-11-07-030012.db',
          createdAt: '2026-11-07T06:00:12.000Z',
          sizeBytes: 1,
        },
        // 12:00 of the 8th and no file of the 8th: it runs as soon as the API can.
        nextScheduledAt: '2026-11-08T15:00:00.000Z',
        running: false,
        lastError: null,
      });
    });

    it('shows tomorrow at 03:00 when today already has its file', async () => {
      touch('fincheck-2026-11-08-030000.db');
      await world.choose();

      const { body } = await world.get('/backup');

      expect(backupStatusDtoSchema.parse(body).nextScheduledAt).toBe('2026-11-09T06:00:00.000Z');
    });

    it('shows today at 03:00 when it is earlier than that and today has no file yet', async () => {
      world.moveTo('2026-11-08T05:00:00.000Z');
      await world.choose();

      const { body } = await world.get('/backup');

      expect(backupStatusDtoSchema.parse(body).nextScheduledAt).toBe('2026-11-08T06:00:00.000Z');
    });

    it('shows no backup, and no error, when the folder vanished', async () => {
      await world.choose();
      rmSync(world.folder, { recursive: true });

      const { status, body } = await world.get('/backup');

      expect(status).toBe(200);
      expect(backupStatusDtoSchema.parse(body)).toMatchObject({
        folderPath: world.folder,
        lastBackup: null,
        lastError: null,
      });
    });
  });

  describe('PUT /backup/settings', () => {
    it('keeps the folder and answers with the status', async () => {
      const { status, body } = await world.choose();

      expect(status).toBe(200);
      expect(backupStatusDtoSchema.parse(body).folderPath).toBe(world.folder);
      const row = await world.database.db.selectFrom('backup_settings').selectAll().execute();
      expect(row).toHaveLength(1);
      expect(row[0]?.folder_path).toBe(world.folder);
    });

    it('changes the folder of the single row and leaves the files of the old folder alone', async () => {
      touch('fincheck-2026-11-07-030000.db');
      await world.choose();
      const other = join(world.root, 'other');
      mkdirSync(other);

      const { body } = await world.put('/backup/settings', { folderPath: other });

      expect(backupStatusDtoSchema.parse(body)).toMatchObject({
        folderPath: other,
        lastBackup: null,
      });
      expect(
        await world.database.db.selectFrom('backup_settings').selectAll().execute(),
      ).toHaveLength(1);
      expect(backupFiles()).toEqual(['fincheck-2026-11-07-030000.db']);
    });

    it('keeps the folder as Windows would write it: no `..`, no trailing backslash', async () => {
      const { body } = await world.put('/backup/settings', {
        folderPath: `${world.folder}\\..\\backups\\`,
      });

      expect(backupStatusDtoSchema.parse(body).folderPath).toBe(world.folder);
    });

    it('refuses a folder that does not exist (422 not_found)', async () => {
      const { status, body } = await world.put('/backup/settings', {
        folderPath: join(world.root, 'missing'),
      });

      expect(status).toBe(422);
      expect(body).toMatchObject({
        code: 'BACKUP_FOLDER_INVALID',
        details: { reason: 'not_found' },
      });
      expect(await world.database.db.selectFrom('backup_settings').selectAll().execute()).toEqual(
        [],
      );
    });

    it('refuses a path that is a file (422 not_a_folder)', async () => {
      const file = join(world.root, 'a-file.txt');
      writeFileSync(file, 'x');

      const { status, body } = await world.put('/backup/settings', { folderPath: file });

      expect(status).toBe(422);
      expect(body).toMatchObject({
        code: 'BACKUP_FOLDER_INVALID',
        details: { reason: 'not_a_folder' },
      });
    });

    it('refuses a relative path (400)', async () => {
      const { status, body } = await world.put('/backup/settings', { folderPath: 'backups' });

      expect(status).toBe(400);
      expect(body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('leaves no test file behind in the folder it checked', async () => {
      await world.choose();

      expect(backupFiles()).toEqual([]);
    });

    it('clears the failure of the last backup, which was about the old folder', async () => {
      await world.choose();
      await world.database.db
        .updateTable('backup_settings')
        .set({ last_error_at: '2026-11-07T10:00:00.000Z', last_error_code: 'BACKUP_FAILED' })
        .execute();

      const { body } = await world.choose();

      expect(backupStatusDtoSchema.parse(body).lastError).toBeNull();
    });
  });

  describe('POST /backup/runs', () => {
    it('refuses without a folder (422 BACKUP_FOLDER_NOT_SET)', async () => {
      const { status, body } = await world.post('/backup/runs');

      expect(status).toBe(422);
      expect(body).toMatchObject({ code: 'BACKUP_FOLDER_NOT_SET' });
    });

    it('answers 202 at once and the file shows up after, built from the clock', async () => {
      await world.choose();

      const { status, body } = await world.post('/backup/runs');

      expect(status).toBe(202);
      expect(backupRunDtoSchema.parse(body)).toEqual({
        fileName: 'fincheck-2026-11-08-120000.db',
        startedAt: '2026-11-08T15:00:00.000Z',
      });
      expect(backupFiles()).toEqual([]);
      expect(backupStatusDtoSchema.parse((await world.get('/backup')).body).running).toBe(true);

      await world.runPending();

      expect(backupFiles()).toEqual(['fincheck-2026-11-08-120000.db']);
      const status2 = backupStatusDtoSchema.parse((await world.get('/backup')).body);
      expect(status2.running).toBe(false);
      expect(status2.lastBackup?.fileName).toBe('fincheck-2026-11-08-120000.db');
      expect(status2.lastBackup?.sizeBytes).toBeGreaterThan(0);
    });

    it('writes a readable copy of the database, WAL included, and leaves no temporary file', async () => {
      await world.choose();
      const accountId = await insertTestAccount(world.database.db, { name: 'Conta no WAL' });
      await insertTestExpense(world.database.db, accountId, { cents: 500, on: '2026-11-05' });

      await world.post('/backup/runs');
      await world.runPending();

      const { default: BetterSqlite3 } = await import('better-sqlite3');
      const copy = new BetterSqlite3(join(world.folder, 'fincheck-2026-11-08-120000.db'), {
        readonly: true,
      });
      try {
        expect(copy.prepare('select name from accounts').all()).toEqual([{ name: 'Conta no WAL' }]);
        expect(copy.pragma('integrity_check', { simple: true })).toBe('ok');
      } finally {
        copy.close();
      }
      expect(backupFiles().filter((name) => name.endsWith('.tmp'))).toEqual([]);
    });

    it('refuses a second one while the first is running (409)', async () => {
      await world.choose();
      await world.post('/backup/runs');

      const { status, body } = await world.post('/backup/runs');

      expect(status).toBe(409);
      expect(body).toMatchObject({ code: 'BACKUP_IN_PROGRESS' });
      await world.runPending();
      expect((await world.post('/backup/runs')).status).toBe(202);
    });

    it('does not overwrite a file made in the same second: the name moves forward', async () => {
      await world.choose();
      touch('fincheck-2026-11-08-120000.db');

      const { body } = await world.post('/backup/runs');

      expect(backupRunDtoSchema.parse(body).fileName).toBe('fincheck-2026-11-08-120001.db');
    });

    it('keeps the 30 newest and leaves alone what is not a backup', async () => {
      await world.choose();
      for (let day = 1; day <= 28; day += 1) {
        touch(`fincheck-2026-10-${String(day).padStart(2, '0')}-030000.db`);
      }
      for (let day = 1; day <= 5; day += 1) {
        touch(`fincheck-2026-11-${String(day).padStart(2, '0')}-030000.db`);
      }
      touch('notes.txt');
      touch('fincheck-2026-11-08.db');

      await world.post('/backup/runs');
      await world.runPending();

      const kept = backupFiles();
      // 33 + the new one = 34; the 4 oldest (October 1 to 4) go.
      expect(
        kept.filter((name) => /^fincheck-\d{4}-\d{2}-\d{2}-\d{6}\.db$/.test(name)),
      ).toHaveLength(30);
      expect(kept).not.toContain('fincheck-2026-10-04-030000.db');
      expect(kept).toContain('fincheck-2026-10-05-030000.db');
      expect(kept).toContain('fincheck-2026-11-08-120000.db');
      expect(kept).toContain('notes.txt');
      expect(kept).toContain('fincheck-2026-11-08.db');
    });

    it('records the failure when the folder vanished and clears it after a good backup', async () => {
      await world.choose();
      rmSync(world.folder, { recursive: true });

      expect((await world.post('/backup/runs')).status).toBe(202);
      await world.runPending();

      const failed = backupStatusDtoSchema.parse((await world.get('/backup')).body);
      expect(failed.running).toBe(false);
      expect(failed.lastError).toEqual({
        at: '2026-11-08T15:00:00.000Z',
        code: 'BACKUP_FOLDER_INVALID',
      });

      mkdirSync(world.folder);
      world.moveTo('2026-11-08T16:00:00.000Z');
      await world.post('/backup/runs');
      await world.runPending();

      const recovered = backupStatusDtoSchema.parse((await world.get('/backup')).body);
      expect(recovered.lastError).toBeNull();
      expect(recovered.lastBackup?.fileName).toBe('fincheck-2026-11-08-130000.db');
    });

    it('keeps the failure after the API restarts (it is in the table)', async () => {
      await world.choose();
      rmSync(world.folder, { recursive: true });
      await world.post('/backup/runs');
      await world.runPending();

      const row = await world.database.db
        .selectFrom('backup_settings')
        .selectAll()
        .executeTakeFirst();

      expect(row?.last_error_code).toBe('BACKUP_FOLDER_INVALID');
      expect(row?.last_error_at).toBe('2026-11-08T15:00:00.000Z');
    });
  });

  describe('GET /backup/files', () => {
    it('is empty while no folder was chosen', async () => {
      const { status, body } = await world.get('/backup/files');

      expect(status).toBe(200);
      expect(body).toEqual({ items: [] });
    });

    it('lists only the files that follow the pattern, newest first', async () => {
      touch('fincheck-2026-11-06-030000.db');
      touch('fincheck-2026-11-08-120000.db');
      touch('fincheck-2026-11-07-030000.db');
      touch('fincheck-2026-11-07-030000.db.tmp');
      touch('fincheck-2026-13-07-030000.db');
      touch('readme.txt');
      mkdirSync(join(world.folder, 'fincheck-2026-11-01-030000.db'));
      await world.choose();

      const { body } = await world.get('/backup/files');

      const items = (body as { items: unknown[] }).items.map((item) =>
        backupFileDtoSchema.parse(item),
      );
      expect(items.map((item) => item.fileName)).toEqual([
        'fincheck-2026-11-08-120000.db',
        'fincheck-2026-11-07-030000.db',
        'fincheck-2026-11-06-030000.db',
      ]);
      expect(items[0]).toEqual({
        fileName: 'fincheck-2026-11-08-120000.db',
        createdAt: '2026-11-08T15:00:00.000Z',
        sizeBytes: 1,
      });
    });

    it('answers 422 BACKUP_FOLDER_INVALID (not_found) when the folder vanished', async () => {
      await world.choose();
      rmSync(world.folder, { recursive: true });

      const { status, body } = await world.get('/backup/files');

      expect(status).toBe(422);
      expect(body).toMatchObject({
        code: 'BACKUP_FOLDER_INVALID',
        details: { reason: 'not_found' },
      });
    });
  });

  describe('GET /backup/stats', () => {
    it('counts the transactions and the accounts that are not archived, and gives the first date', async () => {
      const checking = await insertTestAccount(world.database.db);
      const archived = await insertTestAccount(world.database.db, {
        archived_at: '2026-11-01T00:00:00.000Z',
      });
      await insertTestAccount(world.database.db, { type: 'wallet', institution_code: 'wallet' });
      await insertTestExpense(world.database.db, checking, { cents: 100, on: '2026-09-15' });
      await insertTestExpense(world.database.db, checking, { cents: 200, on: '2026-10-01' });
      await insertTestExpense(world.database.db, archived, {
        cents: 300,
        on: '2026-11-02',
        overrides: { ignored_at: '2026-11-03T00:00:00.000Z' },
      });

      const { status, body } = await world.get('/backup/stats');

      expect(status).toBe(200);
      expect(backupStatsDtoSchema.parse(body)).toMatchObject({
        transactionCount: 3,
        accountCount: 2,
        firstTransactionOn: '2026-09-15',
      });
    });

    it('has no first date while there are no transactions', async () => {
      const { body } = await world.get('/backup/stats');

      expect(backupStatsDtoSchema.parse(body)).toMatchObject({
        transactionCount: 0,
        firstTransactionOn: null,
      });
    });

    it('gives the logical size (pages times page size), the same a backup made now has', async () => {
      const { statSync } = await import('node:fs');
      const checking = await insertTestAccount(world.database.db);
      for (let i = 0; i < 50; i += 1) {
        await insertTestExpense(world.database.db, checking, { cents: 100 + i, on: '2026-09-15' });
      }
      // The write-ahead log is big and the file is not: adding them up would not be the data.
      expect(statSync(`${world.database.file}-wal`).size).toBeGreaterThan(
        statSync(world.database.file).size,
      );

      const { body } = await world.get('/backup/stats');
      await world.choose();
      await world.post('/backup/runs');
      await world.runPending();

      const backup = statSync(join(world.folder, 'fincheck-2026-11-08-120000.db')).size;
      expect(backupStatsDtoSchema.parse(body).dbSizeBytes).toBe(backup);
    });
  });

  describe('the daily backup', () => {
    it('does nothing, and records no error, without a folder', async () => {
      await world.runDailyBackup.execute();

      expect(await world.database.db.selectFrom('backup_settings').selectAll().execute()).toEqual(
        [],
      );
    });

    it('makes the file of the day when the folder has none', async () => {
      await world.choose();

      await world.runDailyBackup.execute();

      expect(backupFiles()).toEqual(['fincheck-2026-11-08-120000.db']);
    });

    it('does not make a second one when a file with the date of today is already there', async () => {
      touch('fincheck-2026-11-08-030000.db');
      await world.choose();

      await world.runDailyBackup.execute();

      expect(backupFiles()).toEqual(['fincheck-2026-11-08-030000.db']);
    });

    it('makes the file of the next day when only yesterday is there', async () => {
      touch('fincheck-2026-11-07-030000.db');
      await world.choose();

      await world.runDailyBackup.execute();

      expect(backupFiles()).toEqual([
        'fincheck-2026-11-07-030000.db',
        'fincheck-2026-11-08-120000.db',
      ]);
    });

    it('leaves a running backup alone', async () => {
      await world.choose();
      await world.post('/backup/runs');

      await world.runDailyBackup.execute();

      expect(backupFiles()).toEqual([]);
      await world.runPending();
      expect(backupFiles()).toEqual(['fincheck-2026-11-08-120000.db']);
    });

    it('records a failure when the folder vanished', async () => {
      await world.choose();
      rmSync(world.folder, { recursive: true });

      await world.runDailyBackup.execute();

      const status = backupStatusDtoSchema.parse((await world.get('/backup')).body);
      expect(status.lastError?.code).toBe('BACKUP_FOLDER_INVALID');
      expect(status.running).toBe(false);
    });
  });
});
