import { Hono } from 'hono';

import type { GetProfileHighlightsController } from '#/modules/profile/http/highlight/get-profile-highlights.controller.ts';

// The curiosities of the profile. Read only.
export function createProfileHighlightsRoute(controllers: {
  getProfileHighlights: GetProfileHighlightsController;
}) {
  return new Hono().get('/profile/highlights', async (c) =>
    c.json(await controllers.getProfileHighlights.handle(), 200),
  );
}
