import { createRoute } from '@tanstack/react-router';

import { InstallmentPlanListPage } from '#/pages/transactions/installment-plan-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

/** `/cards/:accountId/installments`: the installment purchases (plans) of a card. */
export const installmentPlansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cards/$accountId/installments',
  component: InstallmentPlanListPage,
});
