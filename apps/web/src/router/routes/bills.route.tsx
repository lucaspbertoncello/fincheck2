import { createRoute } from '@tanstack/react-router';

import { BillListPage } from '#/pages/recurrences/bill-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const billsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recurrences/bills',
  component: BillListPage,
});
