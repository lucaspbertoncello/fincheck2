import { createRoute } from '@tanstack/react-router';

import { DataPage } from '#/pages/settings/data.page.tsx';
import { settingsRoute } from '#/router/routes/settings.route.tsx';

/** `/settings/data`: Configurações › Dados (BR-BKP-003). */
export const settingsDataRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/data',
  component: DataPage,
});
