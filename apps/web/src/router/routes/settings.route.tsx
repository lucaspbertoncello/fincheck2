import { createRoute } from '@tanstack/react-router';

import { SettingsPage } from '#/pages/settings/settings.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});
