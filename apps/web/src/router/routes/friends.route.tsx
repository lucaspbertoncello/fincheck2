import { createRoute } from '@tanstack/react-router';

import { FriendListPage } from '#/pages/recurrences/friend-list.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

export const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recurrences/friends',
  component: FriendListPage,
});
