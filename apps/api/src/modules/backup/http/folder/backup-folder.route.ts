import { updateBackupSettingsRequestSchema } from '@fincheck/shared/backup/backup-settings/backup-settings.schema.ts';
import { Hono } from 'hono';

import type { UpdateBackupFolderController } from '#/modules/backup/http/folder/update-backup-folder.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// "Trocar pasta": the folder is typed (the browser cannot open a folder picker on the disk).
export function createBackupFolderRoute(controllers: {
  updateBackupFolder: UpdateBackupFolderController;
}) {
  return new Hono().put(
    '/backup/settings',
    validateRequest('json', updateBackupSettingsRequestSchema),
    async (c) =>
      c.json(await controllers.updateBackupFolder.handle({ body: c.req.valid('json') }), 200),
  );
}
