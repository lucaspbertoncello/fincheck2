import { BACKUP_KEEP_COUNT } from '@fincheck/shared/backup/backup-file/backup-file.constant.ts';
import { backupFileDtoSchema } from '@fincheck/shared/backup/backup-file/backup-file.schema.ts';
import { backupRunDtoSchema } from '@fincheck/shared/backup/backup-run/backup-run.schema.ts';
import { updateBackupSettingsRequestSchema } from '@fincheck/shared/backup/backup-settings/backup-settings.schema.ts';
import {
  restoreBackupRequestSchema,
  restoreBackupResponseSchema,
} from '@fincheck/shared/backup/backup-restore/backup-restore.schema.ts';
import { backupStatsDtoSchema } from '@fincheck/shared/backup/backup-stats/backup-stats.schema.ts';
import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import type { BackupStatus } from '@fincheck/shared/backup/backup-status/backup-status.type.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { http } from 'msw';

import { buildBackupFile } from '#mocks/backup/backup/build-backup-file.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { NOW, NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

const newestFirst = () =>
  [...db.backup.files].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// The next 03:00 in São Paulo (06:00 UTC), or now when today's is already past and not done.
function nextScheduledAt(): string {
  const today = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate(), 6));
  const next = today.getTime() > NOW.getTime() ? today : new Date(today.getTime() + 86_400_000);

  return next.toISOString();
}

function buildStatus(): BackupStatus.Dto {
  const last = newestFirst()[0];
  const folder = db.backup.folderPath;

  return {
    folderPath: folder,
    lastBackup:
      folder && last
        ? { fileName: last.fileName, createdAt: last.createdAt, sizeBytes: last.sizeBytes }
        : null,
    keepCount: BACKUP_KEEP_COUNT,
    nextScheduledAt: folder ? nextScheduledAt() : null,
    running: db.backup.running,
    lastError: db.backup.lastError,
  };
}

function storeFile(file: ReturnType<typeof buildBackupFile>) {
  db.backup.files = [...db.backup.files, file]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, BACKUP_KEEP_COUNT);
}

export const backupMock = [
  http.get(
    '/api/backup',
    handleRoute({ response: backupStatusDtoSchema }, () => {
      const status = buildStatus();
      // A backup started by "Fazer backup agora" ends by the next read: the front polls until then.
      if (db.backup.running) {
        db.backup.running = false;
        db.backup.lastError = null;
        storeFile(buildBackupFile(NOW, db.backup.dbSizeBytes));
      }

      return status;
    }),
  ),

  http.put(
    '/api/backup/settings',
    handleRoute(
      { body: updateBackupSettingsRequestSchema, response: backupStatusDtoSchema },
      ({ body }) => {
        // The mock has no disk: a path that says it does not exist behaves like one.
        if (/inexistente|naoexiste/i.test(body.folderPath)) {
          fail(422, 'BACKUP_FOLDER_INVALID', 'A pasta não existe', { reason: 'not_found' });
        }
        db.backup.folderPath = body.folderPath;

        return buildStatus();
      },
    ),
  ),

  http.post(
    '/api/backup/runs',
    handleRoute({ response: backupRunDtoSchema, status: 202 }, () => {
      if (!db.backup.folderPath) fail(422, 'BACKUP_FOLDER_NOT_SET', 'Escolha a pasta antes');
      if (db.backup.running) fail(409, 'BACKUP_IN_PROGRESS', 'Já há um backup em andamento');
      db.backup.running = true;

      return { fileName: buildBackupFile().fileName, startedAt: NOW_ISO };
    }),
  ),

  http.get(
    '/api/backup/files',
    handleRoute({ response: listResponseSchema(backupFileDtoSchema) }, () => ({
      items: db.backup.folderPath ? newestFirst() : [],
    })),
  ),

  // The numbers of the Dados page: counts come from the mock state, the size from the live database.
  http.get(
    '/api/backup/stats',
    handleRoute({ response: backupStatsDtoSchema }, () => ({
      dbSizeBytes: db.backup.dbSizeBytes,
      transactionCount: db.transactions.length,
      accountCount: db.accounts.filter((account) => !account.archivedAt).length,
      firstTransactionOn:
        db.transactions.map((transaction) => transaction.occurredOn).sort()[0] ?? null,
    })),
  ),

  http.post(
    '/api/backup/restore',
    handleRoute(
      { body: restoreBackupRequestSchema, response: restoreBackupResponseSchema, status: 202 },
      ({ body }) => {
        if (db.backup.running) fail(409, 'BACKUP_IN_PROGRESS', 'Já há um backup em andamento');
        if (
          !db.backup.folderPath ||
          !db.backup.files.some((file) => file.fileName === body.fileName)
        ) {
          fail(404, 'BACKUP_FILE_NOT_FOUND', 'O arquivo não está na pasta');
        }
        // The copy of the database in use is kept next to the others, so restoring can be undone.
        const safetyCopy = buildBackupFile(NOW, db.backup.dbSizeBytes);
        storeFile(safetyCopy);

        return { safetyCopyFileName: safetyCopy.fileName };
      },
    ),
  ),
];
