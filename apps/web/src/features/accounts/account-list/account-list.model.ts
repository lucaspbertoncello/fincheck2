import { useQueries, useQuery } from '@tanstack/react-query';

import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useArchiveAccount } from '#/domain/accounts/account/hooks/use-archive-account.hook.ts';
import { useUnarchiveAccount } from '#/domain/accounts/account/hooks/use-unarchive-account.hook.ts';
import { balanceHistoryQueries } from '#/domain/accounts/balance-history/queries/balance-history.query.ts';
import { useOpenInvoices } from '#/domain/invoices/invoice/hooks/use-open-invoices.hook.ts';
import { connectionQueries } from '#/domain/sync/connection/queries/connection.query.ts';
import { useStartConnectionRun } from '#/domain/sync/run/hooks/use-start-connection-run.hook.ts';
import { useInstallmentPlans } from '#/domain/transactions/installment-plan/hooks/use-installment-plans.hook.ts';
import { getCurrentMonthKey } from '#/shared/utils/get-current-month-key.util.ts';

// While a first sync runs the screen watches its progress.
const POLL_MS = 4000;

/** Joins what Contas e cartões reads (accounts, connections, open invoices, installments, curves). */
export function useAccountListModel() {
  const month = getCurrentMonthKey(new Date());
  const accounts = useAccounts({ includeArchived: true });
  const openInvoices = useOpenInvoices();
  const plans = useInstallmentPlans({ active: true });
  const connections = useQuery({
    ...connectionQueries.list(),
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.history.status !== 'done') ? POLL_MS : false,
  });

  // The curve is the balance of the month, so cards, archived accounts and a Pluggy account that
  // has no balance yet have none (the API would answer 422).
  const curveAccounts = (accounts.data?.items ?? []).filter(
    (account) =>
      account.type !== 'credit_card' &&
      !account.archivedAt &&
      !(account.source === 'pluggy' && account.balanceCents === null),
  );
  const histories = useQueries({
    queries: curveAccounts.map((account) => balanceHistoryQueries.byMonth(account.id, month)),
  });
  const curves = Object.fromEntries(
    curveAccounts.map((account, index) => [account.id, histories[index]?.data]),
  );

  const archive = useArchiveAccount();
  const unarchive = useUnarchiveAccount();
  const startRun = useStartConnectionRun();

  function retry() {
    void accounts.refetch();
    void openInvoices.refetch();
    void plans.refetch();
    void connections.refetch();
  }

  return {
    isLoading: accounts.isPending || openInvoices.isPending,
    isError: accounts.isError || openInvoices.isError,
    accounts: accounts.data?.items ?? [],
    openInvoices: openInvoices.data?.items ?? [],
    plans: plans.data?.items ?? [],
    connections: connections.data?.items ?? [],
    curves,
    retry,
    archive,
    unarchive,
    startRun,
  };
}
