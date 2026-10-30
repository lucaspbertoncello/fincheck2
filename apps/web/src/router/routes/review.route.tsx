import { createRoute } from '@tanstack/react-router';

import { ReviewQueuePage } from '#/pages/transactions/review-queue.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions/review',
  component: ReviewQueuePage,
});
