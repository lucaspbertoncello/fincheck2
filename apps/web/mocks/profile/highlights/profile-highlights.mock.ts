import { profileHighlightsDtoSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import { http } from 'msw';

import { buildProfileHighlights } from '#mocks/profile/highlights/build-profile-highlights.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

// BR-PRF-005: the curiosities of the profile, calculated on every read. Writes nothing.
export const profileHighlightsMock = [
  http.get(
    '/api/profile/highlights',
    handleRoute({ response: profileHighlightsDtoSchema }, () => buildProfileHighlights(db)),
  ),
];
