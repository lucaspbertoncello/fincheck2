import { createRoute } from '@tanstack/react-router';

import { CategoryListPage } from '#/pages/categories/category-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/categories',
  component: CategoryListPage,
});
