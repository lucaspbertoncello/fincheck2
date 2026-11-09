import { backupFileDtoSchema } from '@fincheck/shared/backup/backup-file/backup-file.schema.ts';
import { backupRunDtoSchema } from '@fincheck/shared/backup/backup-run/backup-run.schema.ts';
import { restoreBackupResponseSchema } from '@fincheck/shared/backup/backup-restore/backup-restore.schema.ts';
import { backupStatsDtoSchema } from '@fincheck/shared/backup/backup-stats/backup-stats.schema.ts';
import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearBackupFileFaults,
  markBackupFileFault,
} from '#mocks/backup/backup/backup-file-fault.store.ts';
import { buildBackupFile } from '#mocks/backup/backup/build-backup-file.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { NOW, setMockClock, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const NOW_AT_START = new Date(NOW);

afterEach(() => {
  setMockClock(NOW_AT_START);
  clearBackupFileFaults();
});

async function status() {
  return backupStatusDtoSchema.parse((await callApi('GET', '/backup')).json);
}

async function files() {
  return listResponseSchema(backupFileDtoSchema).parse((await callApi('GET', '/backup/files')).json)
    .items;
}

describe('backup routes', () => {
  it('shows the folder, the last backup and the next one', async () => {
    const current = await status();
    expect(current).toMatchObject({
      folderPath: 'D:\\Backups\\fincheck',
      keepCount: 30,
      running: false,
      lastError: null,
    });
    expect(current.lastBackup?.fileName).toBe((await files())[0]?.fileName);
    expect(current.nextScheduledAt).not.toBeNull();
  });

  it('changes the folder, refusing one that does not exist', async () => {
    const changed = backupStatusDtoSchema.parse(
      (await callApi('PUT', '/backup/settings', { folderPath: 'E:\\Copias' })).json,
    );
    expect(changed.folderPath).toBe('E:\\Copias');
    const refused = await callApi('PUT', '/backup/settings', {
      folderPath: 'E:\\Pasta\\Inexistente',
    });
    expect(refused.status).toBe(422);
    expect((refused.json as { details: { reason: string } }).details.reason).toBe('not_found');
    expect((await callApi('PUT', '/backup/settings', { folderPath: 'relativo' })).status).toBe(400);
  });

  it('runs a backup that ends by the next read, and refuses two at once', async () => {
    const before = await files();
    const started = await callApi('POST', '/backup/runs');
    expect(started.status).toBe(202);
    const startedName = backupRunDtoSchema.parse(started.json).fileName;
    expect(startedName).toMatch(/^fincheck-/);
    expect((await callApi('POST', '/backup/runs')).status).toBe(409);
    expect((await status()).running).toBe(true);
    expect((await status()).running).toBe(false);
    // The folder keeps the 30 newest: the new one comes in and the oldest goes out.
    const after = await files();
    expect(after).toHaveLength(30);
    expect(after[0]!.fileName).toBe(startedName);
    expect(after.some((file) => file.fileName === before.at(-1)!.fileName)).toBe(false);
  });

  it('restores a file from the list and keeps a safety copy', async () => {
    const list = await files();
    const restored = await callApi('POST', '/backup/restore', { fileName: list[2]?.fileName });
    expect(restored.status).toBe(202);
    const copy = restoreBackupResponseSchema.parse(restored.json);
    expect((await files()).some((file) => file.fileName === copy.safetyCopyFileName)).toBe(true);
    expect(
      (await callApi('POST', '/backup/restore', { fileName: 'fincheck-2000-01-01-000000.db' }))
        .status,
    ).toBe(404);
    expect((await callApi('POST', '/backup/restore', { fileName: '../outro.db' })).status).toBe(
      400,
    );
  });

  it('keeps 30 daily backups that grow with the data, for the Dados chart', async () => {
    const list = await files();
    expect(list).toHaveLength(30);
    const oldestFirst = list.toReversed();
    expect(oldestFirst[0]!.sizeBytes).toBeLessThan(oldestFirst[29]!.sizeBytes);
    // Growing, with a little wobble: no two neighbours differ by more than a few percent.
    for (let index = 1; index < oldestFirst.length; index += 1) {
      const ratio = oldestFirst[index]!.sizeBytes / oldestFirst[index - 1]!.sizeBytes;
      expect(ratio).toBeGreaterThan(0.98);
      expect(ratio).toBeLessThan(1.05);
    }
  });

  describe('GET /backup/stats', () => {
    async function stats() {
      const answer = await callApi('GET', '/backup/stats');
      expect(answer.status).toBe(200);
      return backupStatsDtoSchema.parse(answer.json);
    }

    it('counts what the mock state holds and sizes the database a little over the newest backup', async () => {
      const current = await stats();

      expect(current.transactionCount).toBe(db.transactions.length);
      expect(current.accountCount).toBe(
        db.accounts.filter((account) => !account.archivedAt).length,
      );
      expect(current.firstTransactionOn).toBe(
        db.transactions.map((transaction) => transaction.occurredOn).sort()[0],
      );
      const newest = (await files())[0]!;
      expect(current.dbSizeBytes).toBeGreaterThan(newest.sizeBytes);
      expect(current.dbSizeBytes).toBeLessThan(newest.sizeBytes * 1.1);
    });

    it('does not count an archived account and follows a new transaction', async () => {
      const before = await stats();
      const account = db.accounts.find((item) => !item.archivedAt)!;
      account.archivedAt = new Date().toISOString();
      db.transactions.pop();

      const after = await stats();
      expect(after.accountCount).toBe(before.accountCount - 1);
      expect(after.transactionCount).toBe(before.transactionCount - 1);
    });

    it('has no first date while there is no transaction', async () => {
      db.transactions.length = 0;

      const empty = await stats();
      expect(empty).toMatchObject({ transactionCount: 0, firstTransactionOn: null });
    });

    it('makes the next backup the size of the database now', async () => {
      const { dbSizeBytes } = await stats();
      await callApi('POST', '/backup/runs');
      await status(); // the backup ends on this read

      expect((await files())[0]!.sizeBytes).toBe(dbSizeBytes);
    });
  });

  describe('against the API', () => {
    const at = (day: string, time: string) => `${day}T${time}.000Z`;

    it('schedules tomorrow at 03:00 when today already has its file', async () => {
      db.backup.files = [buildBackupFile(NOW)];

      expect((await status()).nextScheduledAt).toBe(at(addDays(TODAY, 1), '06:00:00'));
    });

    it('schedules now when today has no file and 03:00 has passed, and 03:00 before it', async () => {
      const afterThree = new Date(`${TODAY}T15:00:00.000Z`);
      setMockClock(afterThree);
      db.backup.files = [];
      expect((await status()).nextScheduledAt).toBe(afterThree.toISOString());

      const beforeThree = new Date(`${TODAY}T05:00:00.000Z`);
      setMockClock(beforeThree);
      expect((await status()).nextScheduledAt).toBe(at(TODAY, '06:00:00'));
    });

    it('tries again an hour after a failure, and then right away', async () => {
      const failedAt = new Date(`${TODAY}T12:00:00.000Z`);
      db.backup.files = [];
      db.backup.lastError = { at: failedAt.toISOString(), code: 'BACKUP_FAILED' };

      setMockClock(new Date(`${TODAY}T12:30:00.000Z`));
      expect((await status()).nextScheduledAt).toBe(at(TODAY, '13:00:00'));

      const later = new Date(`${TODAY}T13:30:00.000Z`);
      setMockClock(later);
      expect((await status()).nextScheduledAt).toBe(later.toISOString());
    });

    it('keeps the safety copy of a restore without cutting the list (31 until the next backup)', async () => {
      const list = await files();
      const restored = await callApi('POST', '/backup/restore', { fileName: list[2]?.fileName });
      const copy = restoreBackupResponseSchema.parse(restored.json);

      const after = await files();
      expect(after).toHaveLength(31);
      expect(after.some((file) => file.fileName === copy.safetyCopyFileName)).toBe(true);
      expect(after.some((file) => file.fileName === list.at(-1)!.fileName)).toBe(true);
    });

    it('answers the errors of a restore in the order of the API', async () => {
      const name = (await files())[0]!.fileName;
      db.backup.running = true;
      expect((await callApi('POST', '/backup/restore', { fileName: name })).status).toBe(409);

      // No folder is a 404 even with a backup running.
      db.backup.folderPath = null;
      expect((await callApi('POST', '/backup/restore', { fileName: name })).status).toBe(404);
      db.backup.running = false;
      db.backup.folderPath = 'D:\\Backups\\Inexistente';

      const gone = await callApi('POST', '/backup/restore', { fileName: name });
      expect(gone.status).toBe(422);
      expect((gone.json as { details: { reason: string } }).details.reason).toBe('not_found');

      db.backup.folderPath = 'D:\\Backups\\fincheck';
      expect(
        (await callApi('POST', '/backup/restore', { fileName: 'fincheck-2000-01-01-000000.db' }))
          .status,
      ).toBe(404);
    });

    it.each(['corrupt', 'not_fincheck', 'newer_version'] as const)(
      'refuses a file that is %s and swaps nothing',
      async (reason) => {
        const name = (await files())[1]!.fileName;
        markBackupFileFault(name, reason);
        const before = await files();

        const refused = await callApi('POST', '/backup/restore', { fileName: name });

        expect(refused.status).toBe(422);
        expect((refused.json as { code: string }).code).toBe('BACKUP_FILE_INVALID');
        expect((refused.json as { details: { reason: string } }).details.reason).toBe(reason);
        expect(await files()).toEqual(before);
      },
    );

    it('checks the folder on the "disk" and gives the path back normalized', async () => {
      const reason = async (folderPath: string) => {
        const answer = await callApi('PUT', '/backup/settings', { folderPath });
        expect(answer.status).toBe(422);

        return (answer.json as { details: { reason: string } }).details.reason;
      };
      expect(await reason('E:\\Pasta\\Inexistente')).toBe('not_found');
      expect(await reason('E:\\Copias\\arquivo.txt')).toBe('not_a_folder');
      expect(await reason('E:\\Somente-Leitura')).toBe('not_writable');

      const changed = backupStatusDtoSchema.parse(
        (
          await callApi('PUT', '/backup/settings', {
            folderPath: 'E:\\Copias\\.\\x\\..\\fincheck\\',
          })
        ).json,
      );
      expect(changed.folderPath).toBe('E:\\Copias\\fincheck');
    });

    it('clears the last failure when the folder changes', async () => {
      db.backup.lastError = { at: new Date().toISOString(), code: 'BACKUP_FOLDER_INVALID' };
      expect((await status()).lastError).not.toBeNull();

      const changed = backupStatusDtoSchema.parse(
        (await callApi('PUT', '/backup/settings', { folderPath: 'E:\\Copias' })).json,
      );

      expect(changed.lastError).toBeNull();
    });
  });
});
