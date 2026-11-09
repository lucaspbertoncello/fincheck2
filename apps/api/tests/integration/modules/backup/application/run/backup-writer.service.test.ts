import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { BackupFolder } from '#/modules/backup/application/folder/backup-folder.interface.ts';
import type { BackupFileInspector } from '#/modules/backup/application/restore/backup-file-inspector.interface.ts';
import type { DatabaseSnapshot } from '#/modules/backup/application/run/database-snapshot.interface.ts';
import { BackupWriter } from '#/modules/backup/application/run/backup-writer.service.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

// The writer with a folder and a snapshot that are doubles, to make the disk fail on purpose.
describe('BackupWriter', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  const files = new Set<string>();
  let snapshotError: Error | null = null;
  let removeError: Error | null = null;
  let integrityOk = true;
  const log: string[] = [];

  const folder: BackupFolder = {
    async listBackups() {
      return [...files]
        .filter((name) => /^fincheck-\d{4}-\d{2}-\d{2}-\d{6}\.db$/.test(name))
        .map((fileName) => ({ fileName, sizeBytes: 1 }));
    },
    async assertUsable() {},
    async rename(_folder, from, to) {
      files.delete(from);
      files.add(to);
    },
    async remove(_folder, fileName) {
      if (removeError && fileName.startsWith('fincheck-2026-10-0')) throw removeError;
      files.delete(fileName);
    },
  };
  const snapshot: DatabaseSnapshot = {
    async copyTo(file) {
      files.add(file.split('\\').pop() ?? file);
      if (snapshotError) throw snapshotError;
    },
  };

  const inspector: BackupFileInspector = {
    async inspect() {
      return { readable: true, integrityOk: integrityOk, tableNames: [], migrationNames: [] };
    },
  };

  const writer = () =>
    new BackupWriter(
      folder,
      snapshot,
      inspector,
      database.db,
      createFixedClock('2026-11-08T15:00:00.000Z'),
      (m) => log.push(m),
    );
  const row = () => database.db.selectFrom('backup_settings').selectAll().executeTakeFirst();

  beforeEach(async () => {
    database = await createTestDatabase();
    files.clear();
    snapshotError = null;
    removeError = null;
    integrityOk = true;
    log.length = 0;
    await database.db
      .insertInto('backup_settings')
      .values({
        id: 1,
        folder_path: 'C:\\backups',
        last_error_at: '2026-11-07T10:00:00.000Z',
        last_error_code: 'BACKUP_FAILED',
        updated_at: '2026-11-07T10:00:00.000Z',
      })
      .execute();
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('copies to a temporary name, renames, and clears the last failure', async () => {
    await writer().write('C:\\backups', 'fincheck-2026-11-08-120000.db');

    expect([...files]).toEqual(['fincheck-2026-11-08-120000.db']);
    expect(await row()).toMatchObject({ last_error_at: null, last_error_code: null });
  });

  it('records the disk being full, leaves no temporary file and throws nothing', async () => {
    snapshotError = Object.assign(new Error('no space'), { code: 'ENOSPC' });

    await writer().write('C:\\backups', 'fincheck-2026-11-08-120000.db');

    expect([...files]).toEqual([]);
    expect(await row()).toMatchObject({
      last_error_at: '2026-11-08T15:00:00.000Z',
      last_error_code: 'BACKUP_DISK_FULL',
    });
  });

  it('records a plain failure for an error it does not know', async () => {
    snapshotError = new Error('strange');

    await writer().write('C:\\backups', 'fincheck-2026-11-08-120000.db');

    expect((await row())?.last_error_code).toBe('BACKUP_FAILED');
  });

  it('refuses a copy that fails its integrity check: no backup file, no rotation, cause in the log', async () => {
    for (let day = 1; day <= 30; day += 1) {
      files.add(`fincheck-2026-10-${String(day).padStart(2, '0')}-030000.db`);
    }
    integrityOk = false;

    await writer().write('C:\backups', 'fincheck-2026-11-08-120000.db');

    expect(files.has('fincheck-2026-11-08-120000.db')).toBe(false);
    expect(files.has('fincheck-2026-10-01-030000.db')).toBe(true);
    expect((await row())?.last_error_code).toBe('BACKUP_FAILED');
    expect(log.some((message) => message.includes('backup: The copy of the database failed'))).toBe(
      true,
    );
  });

  it('throws from `copy` (the safety copy of a restore) and does not touch the last failure', async () => {
    snapshotError = Object.assign(new Error('no space'), { code: 'ENOSPC' });

    await expect(writer().copy('C:\\backups', 'fincheck-2026-11-08-120000.db')).rejects.toThrow(
      'no space',
    );

    expect([...files]).toEqual([]);
    expect((await row())?.last_error_code).toBe('BACKUP_FAILED');
  });

  it('does not fail the backup when an old file cannot be deleted, and says so in the log', async () => {
    for (let day = 1; day <= 30; day += 1) {
      files.add(`fincheck-2026-10-${String(day).padStart(2, '0')}-030000.db`);
    }
    removeError = new Error('file in use');

    await writer().write('C:\\backups', 'fincheck-2026-11-08-120000.db');

    expect(files.has('fincheck-2026-11-08-120000.db')).toBe(true);
    expect((await row())?.last_error_code).toBeNull();
    expect(log.some((message) => message.includes('backup rotation: file in use'))).toBe(true);
  });
});
