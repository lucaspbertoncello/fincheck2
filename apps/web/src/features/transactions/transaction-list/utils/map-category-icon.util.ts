import type { CATEGORY_ICONS } from '@fincheck/shared/categories/category/category.constant.ts';
import type { IconName } from '@fincheck/ui';

type CategoryIconName = (typeof CATEGORY_ICONS)[number];

// The contract names a few icons differently from the design system files.
const ICON_BY_CATEGORY_ICON: Record<CategoryIconName, IconName> = {
  food: 'food',
  deliv: 'delivery',
  cart: 'cart',
  car: 'car',
  fuel: 'fuel',
  house: 'house',
  health: 'health',
  fun: 'fun',
  subs: 'subscription',
  phone: 'phone',
  wifi: 'wifi',
  gym: 'gym',
  gift: 'gift',
  plane: 'plane',
  pet: 'pet',
  shirt: 'shirt',
  book: 'book',
  ticket: 'ticket',
  receipt: 'receipt',
  shield: 'shield',
  salary: 'salary',
  coins: 'coins',
  dollar: 'dollar',
  handmoney: 'hand-money',
  trend: 'trend',
  wallet: 'wallet',
  tag: 'tag',
};

/** Icon of the design system for the icon name a category carries in the contract. */
export function mapCategoryIcon(icon: string | undefined): IconName {
  return ICON_BY_CATEGORY_ICON[icon as CategoryIconName] ?? 'tag';
}
