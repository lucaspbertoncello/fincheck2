import { createRoute } from '@tanstack/react-router';

import { RuleListPage } from '#/pages/categories/rule-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const rulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/categories/rules',
  component: RuleListPage,
});
