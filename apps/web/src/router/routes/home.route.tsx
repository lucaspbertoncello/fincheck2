import { createRoute } from '@tanstack/react-router';

import { HomePage } from '#/pages/home/home.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});
