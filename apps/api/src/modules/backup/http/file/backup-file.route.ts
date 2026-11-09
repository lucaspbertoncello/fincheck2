import { Hono } from 'hono';

import type { ListBackupFilesController } from '#/modules/backup/http/file/list-backup-files.controller.ts';

// The list of the dialog "Restaurar um backup" and of the chart of the size.
export function createBackupFileRoute(controllers: { listBackupFiles: ListBackupFilesController }) {
  return new Hono().get('/backup/files', async (c) =>
    c.json(await controllers.listBackupFiles.handle(), 200),
  );
}
