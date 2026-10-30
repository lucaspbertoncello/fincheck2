import type { QueryClient } from '@tanstack/react-query';

import { accountsKeys } from '#/domain/accounts/cache/constants/accounts-keys.constant.ts';
import { billsKeys } from '#/domain/bills/cache/constants/bills-keys.constant.ts';
import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { invoicesKeys } from '#/domain/invoices/cache/constants/invoices-keys.constant.ts';
import { recurrencesKeys } from '#/domain/recurrences/cache/constants/recurrences-keys.constant.ts';
import { transactionsKeys } from '#/domain/transactions/cache/constants/transactions-keys.constant.ts';

// Money moved or a link changed (a transaction, an occurrence, a bill or invoice payment, an
// account): everything that shows balances or links is stale. That is the transactions, accounts,
// invoices, recurrences and bills, the dashboard (Livre, month summary, agenda, timeline) and the
// rule suggestions (they count what Lucas categorized by hand). Resolves when the active queries
// have refetched, so a mutation stays pending until the screen is right.
export function invalidateLedger(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: transactionsKeys.all }),
    queryClient.invalidateQueries({ queryKey: accountsKeys.all }),
    queryClient.invalidateQueries({ queryKey: invoicesKeys.all }),
    queryClient.invalidateQueries({ queryKey: recurrencesKeys.all }),
    queryClient.invalidateQueries({ queryKey: billsKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    queryClient.invalidateQueries({ queryKey: categoriesKeys.ruleSuggestions() }),
  ]);
}
