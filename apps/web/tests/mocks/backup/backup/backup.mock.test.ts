import { backupFileDtoSchema } from '@fincheck/shared/backup/backup-file/backup-file.schema.ts';
import { backupRunDtoSchema } from '@fincheck/shared/backup/backup-run/backup-run.schema.ts';
import { restoreBackupResponseSchema } from '@fincheck/shared/backup/backup-restore/backup-restore.schema.ts';
import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { describe, expect, it } from 'vitest';

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
      folderPath: 'D:\\Backups\\Fincheck',
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
    const before = (await files()).length;
    const started = await callApi('POST', '/backup/runs');
    expect(started.status).toBe(202);
    expect(backupRunDtoSchema.parse(started.json).fileName).toMatch(/^fincheck-/);
    expect((await callApi('POST', '/backup/runs')).status).toBe(409);
    expect((await status()).running).toBe(true);
    expect((await status()).running).toBe(false);
    expect((await files()).length).toBe(before + 1);
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
});
