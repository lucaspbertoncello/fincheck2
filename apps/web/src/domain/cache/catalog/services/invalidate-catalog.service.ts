import type { QueryClient } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { transactionsKeys } from '#/domain/transactions/cache/constants/transactions-keys.constant.ts';

// A category or a tag changed (name, icon, archived): the catalog itself, the transactions that
// carry it and the dashboard breakdowns are stale. Balances and links are not.
export function invalidateCatalog(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: categoriesKeys.all }),
    queryClient.invalidateQueries({ queryKey: transactionsKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  ]);
}
