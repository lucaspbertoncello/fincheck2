import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { IconName } from '@fincheck/ui';

// Three contract names differ from the file names of the design system icons.
const DIFFERENT_NAMES: Partial<Record<Category.Icon, IconName>> = {
  deliv: 'delivery',
  subs: 'subscription',
  handmoney: 'hand-money',
};

/** The icon of the design system for a category icon of the contract. */
export function toUiIcon(icon: Category.Icon): IconName {
  return DIFFERENT_NAMES[icon] ?? (icon as IconName);
}
