import { useBills } from '#/domain/bills/bill/hooks/use-bills.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';

/** What the Amigos tab reads: every friend debt, settled ones included, and the categories for the icons. */
export function useFriendListModel() {
  return {
    bills: useBills({ kind: 'friend', status: 'all' }),
    categories: useCategories({ status: 'all' }),
  };
}
