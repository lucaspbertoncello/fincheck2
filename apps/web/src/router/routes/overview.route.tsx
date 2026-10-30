import { createRoute } from '@tanstack/react-router';

import { OverviewPage } from '#/pages/overview/overview.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: OverviewPage,
});
