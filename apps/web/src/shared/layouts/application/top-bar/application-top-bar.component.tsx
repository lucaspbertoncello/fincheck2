import { Logo, PlusButton, PlusMenu, SettingsLink, TabNav, TopBar } from '@fincheck/ui';
import { useRouter } from '@tanstack/react-router';
import { Link } from 'react-aria-components';

import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { buildNavigationItems } from '#/shared/layouts/application/navigation/build-navigation-items.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import {
  PLUS_ACTION_PATHS,
  PLUS_MENU_ITEMS,
} from '#/shared/layouts/application/top-bar/plus-menu-items.constant.ts';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

type ApplicationTopBarProps = {
  screen: ScreenDefinition;
  monthParam: string | undefined;
};

/** Top bar of the app: logo, the five tabs, the settings gear and the "+" of the screen. */
export function ApplicationTopBar({ screen, monthParam }: ApplicationTopBarProps) {
  const router = useRouter();
  const items = buildNavigationItems(monthParam);

  function handlePlusAction(key: string) {
    const path = PLUS_ACTION_PATHS[key];
    if (path) navigateToHref(router, buildHref(path, monthParam));
  }

  return (
    <TopBar
      logo={
        <Link
          href={buildHref('/', monthParam)}
          aria-label="Fincheck, Visão geral"
          className="shrink-0 rounded-input outline-none"
        >
          <span data-logo-slot className="block">
            <Logo />
          </span>
        </Link>
      }
      navigation={<TabNav items={items} activeKey={screen.tab} label="Principal" />}
      actions={
        <>
          <SettingsLink
            href={buildHref('/settings', monthParam)}
            label="Configurações"
            active={screen.key === 'settings'}
          />
          {screen.plusMode === 'menu' ? (
            <PlusMenu
              label={screen.plusLabel}
              items={PLUS_MENU_ITEMS}
              onAction={handlePlusAction}
            />
          ) : (
            <PlusButton
              label={screen.plusLabel}
              onPress={() => screen.plusAction && handlePlusAction(screen.plusAction)}
            />
          )}
        </>
      }
    />
  );
}
