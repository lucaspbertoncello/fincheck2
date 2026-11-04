import { Navigate } from '@tanstack/react-router';

import { SettingsIndexView } from '#/features/settings/settings/settings-index/settings-index.view.tsx';
import { useSettingsNavItems } from '#/features/settings/settings/hooks/use-settings-nav-items.hook.ts';
import { SETTINGS_SECTION } from '#/features/settings/settings/constants/settings-sections.constant.ts';
import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';

const FIRST_PAGE = SETTINGS_SECTION.profile.path;

/**
 * `/settings`. On the desktop the menu is always on screen beside a page, so it goes to Perfil; on
 * the phone it is the list that opens each page.
 */
export function SettingsIndexViewModel() {
  const isDesktop = useIsDesktop();
  const navItems = useSettingsNavItems();

  if (isDesktop) return <Navigate to={FIRST_PAGE} search={(previous) => previous} replace />;
  return <SettingsIndexView navItems={navItems} />;
}
