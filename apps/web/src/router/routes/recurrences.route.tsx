import { createRoute } from '@tanstack/react-router';

import { RecurrenceListPage } from '#/pages/recurrences/recurrence-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const recurrencesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recurrences',
  component: RecurrenceListPage,
});
