import type { NavItem } from '@fincheck/ui';

import { NAVIGATION_DEFINITIONS } from '#/shared/layouts/application/navigation/navigation-items.constant.ts';
import { toNavigationItem } from '#/shared/layouts/application/navigation/to-navigation-item.util.ts';

/** The five items of the phone bottom bar: the rail without Perfil. */
export function buildBottomNavigationItems(monthParam: string | undefined): NavItem[] {
  return NAVIGATION_DEFINITIONS.filter((definition) => definition.inBottomBar).map((definition) =>
    toNavigationItem(definition, monthParam),
  );
}
