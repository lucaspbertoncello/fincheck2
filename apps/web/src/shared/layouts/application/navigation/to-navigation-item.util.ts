import type { NavItem } from '@fincheck/ui';

import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import type { NavigationDefinition } from '#/shared/layouts/application/navigation/navigation-items.constant.ts';

/** One entry of the navigation as the rail and the bottom bar draw it, keeping the selected month. */
export function toNavigationItem(
  definition: NavigationDefinition,
  monthParam: string | undefined,
): NavItem {
  return {
    key: definition.key,
    label: definition.label,
    shortLabel: definition.shortLabel,
    href: buildHref(definition.path, monthParam),
    icon: definition.icon,
  };
}
