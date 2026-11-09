import { Hono } from 'hono';

import type { StartBackupRunController } from '#/modules/backup/http/run/start-backup-run.controller.ts';

// "Fazer backup agora": answers 202 and the copy runs after; the front reads `GET /backup`.
export function createBackupRunRoute(controllers: { startBackupRun: StartBackupRunController }) {
  return new Hono().post('/backup/runs', async (c) =>
    c.json(await controllers.startBackupRun.handle(), 202),
  );
}
