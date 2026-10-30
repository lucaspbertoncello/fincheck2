import type { NavItem } from '@fincheck/ui';

import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { NAVIGATION_DEFINITIONS } from '#/shared/layouts/application/navigation/navigation-items.constant.ts';

/** The five navigation items with hrefs that keep the selected month. */
export function buildNavigationItems(monthParam: string | undefined): NavItem[] {
  return NAVIGATION_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    shortLabel: definition.shortLabel,
    href: buildHref(definition.path, monthParam),
    icon: definition.icon,
  }));
}
