import { createRoute } from '@tanstack/react-router';

import { ProfilePage } from '#/pages/settings/profile.page.tsx';
import { settingsRoute } from '#/router/routes/settings.route.tsx';

/** `/settings/profile`: Configurações › Perfil. */
export const settingsProfileRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/profile',
  component: ProfilePage,
});
