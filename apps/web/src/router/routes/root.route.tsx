import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import type { RouterContext } from '#/router/router-context.type.ts';

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
});
