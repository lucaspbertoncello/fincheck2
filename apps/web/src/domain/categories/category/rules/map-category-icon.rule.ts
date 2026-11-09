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
  care: 'care',
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
  leaf: 'leaf',
  stadium: 'stadium',
  transfer: 'transfer',
  people: 'people',
};

/**
 * Icon of the design system for the icon key a category carries in the contract (the one map of
 * the app). `fallback` when the key is empty or unknown.
 */
export function mapCategoryIcon(
  icon: string | null | undefined,
  fallback: IconName = 'tag',
): IconName {
  if (!icon) return fallback;
  return ICON_BY_CATEGORY_ICON[icon as CategoryIconName] ?? fallback;
}
