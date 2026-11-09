import { restoreBackupRequestSchema } from '@fincheck/shared/backup/backup-restore/backup-restore.schema.ts';
import { Hono } from 'hono';

import type { RestoreBackupController } from '#/modules/backup/http/restore/restore-backup.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// Restores a backup: answers 202 and the swap runs after; `GET /health` is not `ok` until it ends.
export function createBackupRestoreRoute(controllers: { restoreBackup: RestoreBackupController }) {
  return new Hono().post(
    '/backup/restore',
    validateRequest('json', restoreBackupRequestSchema),
    async (c) => c.json(await controllers.restoreBackup.handle({ body: c.req.valid('json') }), 202),
  );
}
