import { createRoute, redirect } from '@tanstack/react-router';

import { findSectionByHash } from '#/features/settings/settings/utils/find-section-by-hash.util.ts';
import { SettingsIndexPage } from '#/pages/settings/settings-index.page.tsx';
import { settingsRoute } from '#/router/routes/settings.route.tsx';

/**
 * `/settings`: the old anchors (`/settings#backup`) go to the page of the section, keeping the
 * search; with no anchor the page decides (list on the phone, Perfil on the desktop).
 */
export const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: ({ location }) => {
    const section = findSectionByHash(location.hash);
    if (section)
      // The four paths are routes of the tree; `section.path` is typed as a plain string.
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects by throwing `redirect()`
      throw redirect({
        to: section.path as '/settings/profile',
        search: (previous) => previous,
        replace: true,
      });
  },
  component: SettingsIndexPage,
});
