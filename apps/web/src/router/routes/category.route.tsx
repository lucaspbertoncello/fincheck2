import { createRoute } from '@tanstack/react-router';

import { CategoryPage } from '#/pages/categories/category.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

/** `/categories/:id`: the page of one category. `/categories/rules` is its own, static route. */
export const categoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/categories/$id',
  component: CategoryPage,
});
