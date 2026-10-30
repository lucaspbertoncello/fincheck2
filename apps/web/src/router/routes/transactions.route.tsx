import { createRoute } from '@tanstack/react-router';

import { TransactionListPage } from '#/pages/transactions/transaction-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: TransactionListPage,
});
