import type { NavItem } from '@fincheck/ui';

import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import {
  NAVIGATION_DEFINITIONS,
  type NavigationDefinition,
} from '#/shared/layouts/application/navigation/navigation-items.constant.ts';

function toItem(definition: NavigationDefinition, monthParam: string | undefined): NavItem {
  return {
    key: definition.key,
    label: definition.label,
    shortLabel: definition.shortLabel,
    href: buildHref(definition.path, monthParam),
    icon: definition.icon,
  };
}

/** The six items of the desktop rail, with hrefs that keep the selected month. */
export function buildNavigationItems(monthParam: string | undefined): NavItem[] {
  return NAVIGATION_DEFINITIONS.map((definition) => toItem(definition, monthParam));
}

/** The five items of the phone bottom bar: the rail without Perfil. */
export function buildBottomNavigationItems(monthParam: string | undefined): NavItem[] {
  return NAVIGATION_DEFINITIONS.filter((definition) => definition.inBottomBar).map((definition) =>
    toItem(definition, monthParam),
  );
}
