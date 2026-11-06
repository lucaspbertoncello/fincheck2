import { createRoute, redirect } from '@tanstack/react-router';

import { settingsRoute } from '#/router/routes/settings.route.tsx';

/**
 * `/settings/backup`: Backup became Dados (BR-BKP-003, Polimento 13) and lives at `/settings/data`.
 * The old address redirects there, keeping the search (the selected month).
 */
export const settingsBackupRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/backup',
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects by throwing `redirect()`
    throw redirect({ to: '/settings/data', search: (previous) => previous, replace: true });
  },
});
