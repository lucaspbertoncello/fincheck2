import { updateProfileRequestSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import { Hono } from 'hono';

import type { GetProfileController } from '#/modules/profile/http/profile/get-profile.controller.ts';
import type { UpdateProfileController } from '#/modules/profile/http/profile/update-profile.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The profile: the read (with the income) and the save of the name, the initials and the avatar.
export function createProfileRoute(controllers: {
  getProfile: GetProfileController;
  updateProfile: UpdateProfileController;
}) {
  return new Hono()
    .get('/profile', async (c) => c.json(await controllers.getProfile.handle(), 200))
    .put('/profile', validateRequest('json', updateProfileRequestSchema), async (c) =>
      c.json(await controllers.updateProfile.handle({ body: c.req.valid('json') }), 200),
    );
}
