import { Hono } from 'hono';

import type { GetBackupStatsController } from '#/modules/backup/http/stats/get-backup-stats.controller.ts';

// The numbers on top of the page Dados.
export function createBackupStatsRoute(controllers: { getBackupStats: GetBackupStatsController }) {
  return new Hono().get('/backup/stats', async (c) =>
    c.json(await controllers.getBackupStats.handle(), 200),
  );
}
