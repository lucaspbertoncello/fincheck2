import { createRoute } from '@tanstack/react-router';

import { AccountListPage } from '#/pages/accounts/account-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounts',
  component: AccountListPage,
});
