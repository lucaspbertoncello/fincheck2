import type { FreeBalanceData } from '@fincheck/ui';

import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useFreeBalance } from '#/domain/dashboard/free-balance/hooks/use-free-balance.hook.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { buildFreeBalanceData } from '#/shared/layouts/application/summary/utils/build-free-balance-data.util.tsx';

type ApplicationSummary =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: FreeBalanceData };

/**
 * Data of the Livre panel: `GET /dashboard/free-balance`, plus the accounts (bank marks, sync
 * state and the sum shown as the big number). The numbers never depend on the selected month; the
 * month only travels in the "Ver mais" link.
 */
export function useApplicationSummary(): ApplicationSummary {
  const { month } = useSelectedMonth();
  const freeBalance = useFreeBalance();
  const accounts = useAccounts();

  if (freeBalance.isError) {
    return { status: 'error', retry: () => void freeBalance.refetch() };
  }
  if (!freeBalance.data || accounts.isPending) {
    return { status: 'loading' };
  }

  // The lists around the Livre are a nicety: without them the number still shows.
  const accountItems = accounts.data?.items ?? [];
  return {
    status: 'ready',
    data: buildFreeBalanceData({
      freeBalance: freeBalance.data,
      accounts: accountItems,
      accountsHref: buildHref('/accounts', month),
    }),
  };
}
