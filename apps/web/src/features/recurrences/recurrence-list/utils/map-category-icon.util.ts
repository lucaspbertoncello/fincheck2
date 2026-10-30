import type { IconName } from '@fincheck/ui';

// Names of the category icon set that differ from the UI icon names.
const RENAMED: Record<string, IconName> = {
  deliv: 'delivery',
  subs: 'subscription',
  handmoney: 'hand-money',
};

/** Icon of a category (shared name) as a UI icon; `repeat` when there is none. */
export function mapCategoryIcon(icon: string | undefined): IconName {
  if (!icon) return 'repeat';
  return RENAMED[icon] ?? (icon as IconName);
}
