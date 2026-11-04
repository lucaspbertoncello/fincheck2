import { createRoute } from '@tanstack/react-router';

import { BackupPage } from '#/pages/settings/backup.page.tsx';
import { settingsRoute } from '#/router/routes/settings.route.tsx';

/** `/settings/backup`: Configurações › Backup. */
export const settingsBackupRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/backup',
  component: BackupPage,
});
