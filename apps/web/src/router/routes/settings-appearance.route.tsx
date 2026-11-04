import { createRoute } from '@tanstack/react-router';

import { AppearancePage } from '#/pages/settings/appearance.page.tsx';
import { settingsRoute } from '#/router/routes/settings.route.tsx';

/** `/settings/appearance`: Configurações › Aparência. */
export const settingsAppearanceRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/appearance',
  component: AppearancePage,
});
