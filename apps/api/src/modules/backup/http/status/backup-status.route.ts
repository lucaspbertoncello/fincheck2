import { Hono } from 'hono';

import type { GetBackupStatusController } from '#/modules/backup/http/status/get-backup-status.controller.ts';

// Configurações › Dados: the state of the backup (folder, last file, next run, running, last error).
export function createBackupStatusRoute(controllers: {
  getBackupStatus: GetBackupStatusController;
}) {
  return new Hono().get('/backup', async (c) =>
    c.json(await controllers.getBackupStatus.handle(), 200),
  );
}
