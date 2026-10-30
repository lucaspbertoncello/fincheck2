import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { accountsRoute } from '#/router/routes/accounts.route.tsx';
import { billsRoute } from '#/router/routes/bills.route.tsx';
import { categoriesRoute } from '#/router/routes/categories.route.tsx';
import { overviewRoute } from '#/router/routes/overview.route.tsx';
import { recurrencesRoute } from '#/router/routes/recurrences.route.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';
import { reviewRoute } from '#/router/routes/review.route.tsx';
import { rulesRoute } from '#/router/routes/rules.route.tsx';
import { settingsRoute } from '#/router/routes/settings.route.tsx';
import { transactionsRoute } from '#/router/routes/transactions.route.tsx';
import { getTabTransitionTypes } from '#/shared/layouts/application/transition/get-tab-transition-types.util.ts';

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree: rootRoute.addChildren([
      overviewRoute,
      transactionsRoute,
      reviewRoute,
      recurrencesRoute,
      billsRoute,
      accountsRoute,
      categoriesRoute,
      rulesRoute,
      settingsRoute,
    ]),
    context: { queryClient },
    defaultPreload: 'intent',
    // Page transition between tabs (motion.md 1); the types give the direction.
    defaultViewTransition: { types: getTabTransitionTypes },
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
