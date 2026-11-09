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

import { findBackupFileFault } from '#mocks/backup/backup/backup-file-fault.store.ts';
import { buildBackupFile } from '#mocks/backup/backup/build-backup-file.util.ts';
import { computeNextBackupAt } from '#mocks/backup/backup/compute-next-backup-at.util.ts';
import { inspectFolder } from '#mocks/backup/backup/inspect-folder.util.ts';
import { normalizeFolderPath } from '#mocks/backup/backup/normalize-folder-path.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { NOW, NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

const FOLDER_MESSAGE = {
  not_found: 'A pasta de backup não existe ou não abre.',
  not_a_folder: 'O caminho informado não é uma pasta.',
  not_writable: 'Não consegui gravar na pasta de backup.',
} as const;

const FILE_MESSAGE = {
  corrupt: 'O arquivo de backup está danificado.',
  not_fincheck: 'Esse arquivo não é um banco do Fincheck.',
  newer_version: 'Esse backup vem de uma versão mais nova do Fincheck.',
} as const;

const newestFirst = () =>
  [...db.backup.files].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
    nextScheduledAt: folder
      ? computeNextBackupAt({
          now: NOW_ISO,
          today: TODAY,
          // The day is the one in the name of the file (São Paulo's clock).
          hasBackupToday: db.backup.files.some((file) => file.fileName.slice(9, 19) === TODAY),
          lastErrorAt: db.backup.lastError?.at ?? null,
        })
      : null,
    running: db.backup.running,
    lastError: db.backup.lastError,
  };
}

// A backup of the clock keeps the 30 newest; the safety copy of a restore comes in without cutting
// anything (there can be 31 until the next backup).
function storeFile(file: ReturnType<typeof buildBackupFile>, options: { rotate: boolean }) {
  const sorted = [...db.backup.files, file].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  db.backup.files = options.rotate ? sorted.slice(0, BACKUP_KEEP_COUNT) : sorted;
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
        storeFile(buildBackupFile(NOW, db.backup.dbSizeBytes), { rotate: true });
      }

      return status;
    }),
  ),

  http.put(
    '/api/backup/settings',
    handleRoute(
      { body: updateBackupSettingsRequestSchema, response: backupStatusDtoSchema },
      ({ body }) => {
        const folderPath = normalizeFolderPath(body.folderPath);
        const reason = inspectFolder(folderPath);
        if (reason) fail(422, 'BACKUP_FOLDER_INVALID', FOLDER_MESSAGE[reason], { reason });
        db.backup.folderPath = folderPath;
        // The last failure was about the old folder.
        db.backup.lastError = null;

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
        // The order of the API: no folder, a restore or backup under way, the folder gone, the
        // file not in it, and only then the file itself.
        if (!db.backup.folderPath)
          fail(404, 'BACKUP_FILE_NOT_FOUND', 'O arquivo não está na pasta');
        if (db.backup.running) fail(409, 'BACKUP_IN_PROGRESS', 'Já há um backup em andamento');
        const folderReason = inspectFolder(db.backup.folderPath);
        if (folderReason) {
          fail(422, 'BACKUP_FOLDER_INVALID', FOLDER_MESSAGE[folderReason], {
            reason: folderReason,
          });
        }
        if (!db.backup.files.some((file) => file.fileName === body.fileName)) {
          fail(404, 'BACKUP_FILE_NOT_FOUND', 'O arquivo não está na pasta');
        }
        const fault = findBackupFileFault(body.fileName);
        if (fault) {
          fail(422, 'BACKUP_FILE_INVALID', FILE_MESSAGE[fault], { reason: fault });
        }
        // The copy of the database in use is kept next to the others, so restoring can be undone.
        const safetyCopy = buildBackupFile(NOW, db.backup.dbSizeBytes);
        storeFile(safetyCopy, { rotate: false });

        return { safetyCopyFileName: safetyCopy.fileName };
      },
    ),
  ),
];
