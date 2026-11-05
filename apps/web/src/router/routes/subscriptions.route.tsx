import { createRoute } from '@tanstack/react-router';

import { SubscriptionListPage } from '#/pages/recurrences/subscription-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const subscriptionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recurrences/subscriptions',
  component: SubscriptionListPage,
});
