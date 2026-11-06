import { createRoute, redirect } from '@tanstack/react-router';

import { findSectionByHash } from '#/features/settings/settings/utils/find-section-by-hash.util.ts';
import { isDesktopViewport } from '#/router/viewport/is-desktop-viewport.util.ts';
import { SettingsIndexPage } from '#/pages/settings/settings-index.page.tsx';
import { settingsRoute } from '#/router/routes/settings.route.tsx';

/**
 * `/settings`: the old anchors (`/settings#backup`, which is now Dados) go to the page of the section, keeping the
 * search (`#profile` goes to the Perfil screen, which left Configurações); with no anchor the page
 * is the list on the phone. On the desktop there is no list: the menu is always beside a page, so
 * `/settings` goes to Conexões here, before anything is committed. A redirect from the component
 * (`<Navigate>`) would commit an empty frame and start a second page transition that skips the
 * first, and Configurações would appear without animation.
 */
export const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: ({ location }) => {
    if (location.hash === 'profile' || location.hash === '#profile')
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects by throwing `redirect()`
      throw redirect({ to: '/profile', search: (previous) => previous, hash: '', replace: true });
    const section = findSectionByHash(location.hash);
    if (section)
      // The three paths are routes of the tree; `section.path` is typed as a plain string.
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects by throwing `redirect()`
      throw redirect({
        to: section.path as '/settings/data',
        search: (previous) => previous,
        replace: true,
      });
    if (isDesktopViewport())
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects by throwing `redirect()`
      throw redirect({
        to: '/settings/connections',
        search: (previous) => previous,
        replace: true,
      });
  },
  component: SettingsIndexPage,
});
