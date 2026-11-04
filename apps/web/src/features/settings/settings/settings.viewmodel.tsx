import { Outlet, useRouterState } from '@tanstack/react-router';

import { useSettingsNavItems } from '#/features/settings/settings/hooks/use-settings-nav-items.hook.ts';
import { SettingsView } from '#/features/settings/settings/settings.view.tsx';
import { findSectionByPathname } from '#/features/settings/settings/utils/find-section-by-pathname.util.ts';
import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { usePanelSlot } from '#/shared/layouts/application/panel/panel-slot.context.ts';

/**
 * Frame of Configurações: on the desktop the menu of the four pages goes into the left column of
 * the shell and stays there while the pages change; the page of the route comes in the `Outlet`.
 */
export function SettingsViewModel() {
  const isDesktop = useIsDesktop();
  const panelSlot = usePanelSlot();
  const navItems = useSettingsNavItems();
  // The committed pathname (as `useActiveScreen` reads it): the marked item changes with the new page.
  const pathname = useRouterState({
    select: (state) => state.matches.at(-1)?.pathname ?? state.location.pathname,
  });

  return (
    <SettingsView
      isDesktop={isDesktop}
      panelSlot={panelSlot}
      navItems={navItems}
      activeKey={findSectionByPathname(pathname)?.key ?? null}
    >
      <Outlet />
    </SettingsView>
  );
}
