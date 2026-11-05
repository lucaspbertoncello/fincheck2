import { createRoute, redirect } from '@tanstack/react-router';

import { settingsRoute } from '#/router/routes/settings.route.tsx';

/**
 * `/settings/profile`: Perfil left Configurações (BR-PRF-004) and has its own screen at `/profile`.
 * The old address redirects there, keeping the search (the selected month).
 */
export const settingsProfileRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/profile',
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects by throwing `redirect()`
    throw redirect({ to: '/profile', search: (previous) => previous, replace: true });
  },
});
