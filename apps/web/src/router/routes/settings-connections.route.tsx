import { createRoute } from '@tanstack/react-router';

import { ConnectionsPage } from '#/pages/settings/connections.page.tsx';
import { settingsRoute } from '#/router/routes/settings.route.tsx';

/** `/settings/connections`: Configurações › Conexões. */
export const settingsConnectionsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/connections',
  component: ConnectionsPage,
});
