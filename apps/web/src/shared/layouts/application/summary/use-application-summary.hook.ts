import type { FreeBalanceData } from '@fincheck/ui';

import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useFreeBalance } from '#/domain/dashboard/free-balance/hooks/use-free-balance.hook.ts';
import { useOpenInvoices } from '#/domain/invoices/invoice/hooks/use-open-invoices.hook.ts';
import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import {
  buildFreeBalanceData,
  buildPartialNotice,
} from '#/shared/layouts/application/summary/utils/build-free-balance-data.util.tsx';

type ApplicationSummary =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: FreeBalanceData; partialNotice: string | undefined };

/**
 * Data of the Livre panel: `GET /dashboard/free-balance`, plus the accounts (bank marks and sync
 * state) and the open invoices the panel lists. The Livre never depends on the selected month; the
 * month only travels in the "Para revisar" link.
 */
export function useApplicationSummary(): ApplicationSummary {
  const { isHidden } = useHideValues();
  const { month } = useSelectedMonth();
  const freeBalance = useFreeBalance();
  const accounts = useAccounts();
  const openInvoices = useOpenInvoices();

  if (freeBalance.isError) {
    return { status: 'error', retry: () => void freeBalance.refetch() };
  }
  if (!freeBalance.data || accounts.isPending || openInvoices.isPending) {
    return { status: 'loading' };
  }

  // The lists around the Livre are a nicety: without them the number still shows.
  const accountItems = accounts.data?.items ?? [];
  return {
    status: 'ready',
    partialNotice: buildPartialNotice(freeBalance.data, accountItems),
    data: buildFreeBalanceData({
      freeBalance: freeBalance.data,
      accounts: accountItems,
      openInvoices: openInvoices.data?.items ?? [],
      reviewHref: buildHref('/transactions/review', month),
      isHidden,
      now: new Date(),
    }),
  };
}
