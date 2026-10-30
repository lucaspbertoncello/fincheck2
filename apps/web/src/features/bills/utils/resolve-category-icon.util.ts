import type { IconName } from '@fincheck/ui';

// The category icon keys of the API that the icon set names differently.
const RENAMED: Record<string, IconName> = { deliv: 'delivery', subs: 'subscription' };

/** Maps a category icon key of the API to an icon of the set; `fallback` when it has none. */
export function resolveCategoryIcon(
  icon: string | null | undefined,
  fallback: IconName = 'tag',
): IconName {
  if (!icon) return fallback;
  return RENAMED[icon] ?? (icon as IconName);
}
