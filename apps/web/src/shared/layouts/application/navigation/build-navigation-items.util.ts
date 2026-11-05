import type { NavItem } from '@fincheck/ui';

import { NAVIGATION_DEFINITIONS } from '#/shared/layouts/application/navigation/navigation-items.constant.ts';
import { toNavigationItem } from '#/shared/layouts/application/navigation/to-navigation-item.util.ts';

/** The six items of the desktop rail, with hrefs that keep the selected month. */
export function buildNavigationItems(monthParam: string | undefined): NavItem[] {
  return NAVIGATION_DEFINITIONS.map((definition) => toNavigationItem(definition, monthParam));
}
