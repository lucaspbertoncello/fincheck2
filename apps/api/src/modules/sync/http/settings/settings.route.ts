import { saveSyncSettingsRequestSchema } from '@fincheck/shared/sync/settings/settings.schema.ts';
import { Hono } from 'hono';

import type { GetSyncSettingsController } from '#/modules/sync/http/settings/get-sync-settings.controller.ts';
import type { SaveSyncSettingsController } from '#/modules/sync/http/settings/save-sync-settings.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The keys of the Pluggy (RF-SYN-001, RNF-004): read whether they are saved, and save them.
export function createSyncSettingsRoute(controllers: {
  getSettings: GetSyncSettingsController;
  saveSettings: SaveSyncSettingsController;
}) {
  return new Hono()
    .get('/sync/settings', async (c) => c.json(await controllers.getSettings.handle(), 200))
    .put('/sync/settings', validateRequest('json', saveSyncSettingsRequestSchema), async (c) =>
      c.json(await controllers.saveSettings.handle({ body: c.req.valid('json') }), 200),
    );
}
