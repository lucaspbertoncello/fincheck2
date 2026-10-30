import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { IconName } from '@fincheck/ui';

const ICON_BY_CATEGORY_ICON: Record<Category.Dto['icon'], IconName> = {
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

/** The icon a category carries in the API, named as the design system knows it. */
export function toUiIcon(categoryIcon: Category.Dto['icon']): IconName {
  return ICON_BY_CATEGORY_ICON[categoryIcon];
}
