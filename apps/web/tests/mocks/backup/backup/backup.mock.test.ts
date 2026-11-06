import { backupFileDtoSchema } from '@fincheck/shared/backup/backup-file/backup-file.schema.ts';
import { backupRunDtoSchema } from '@fincheck/shared/backup/backup-run/backup-run.schema.ts';
import { restoreBackupResponseSchema } from '@fincheck/shared/backup/backup-restore/backup-restore.schema.ts';
import { backupStatsDtoSchema } from '@fincheck/shared/backup/backup-stats/backup-stats.schema.ts';
import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

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
});
