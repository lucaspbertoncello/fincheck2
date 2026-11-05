import { createRoute } from '@tanstack/react-router';

import { ProfilePage } from '#/pages/profile/profile.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

/** `/profile`: Perfil, a screen of its own below Categorias in the rail. */
export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});
