import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { homeRoute } from '#/router/routes/home.route.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree: rootRoute.addChildren([homeRoute]),
    context: { queryClient },
    defaultPreload: 'intent',
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
