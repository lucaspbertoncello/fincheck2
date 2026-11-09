import type { FreeBalance } from '@fincheck/shared/dashboard/free-balance/free-balance.type.ts';

import { presentAccount } from '#mocks/accounts/account/present-account.util.ts';
import { buildAgendaItems } from '#mocks/dashboard/agenda/build-agenda-items.util.ts';
import { compareAgendaItems } from '#mocks/dashboard/agenda/compare-agenda-items.util.ts';
import { isConnectionStale } from '#mocks/sync/connection/is-connection-stale.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { isInReview } from '#mocks/transactions/transaction/is-in-review.util.ts';

// The Livre: balance in the accounts + what still comes in - what still goes out, from today to the
// end of the current month (dashboard.md, "Livre"). Payments already made but not tied count as paid.
export function computeFreeBalance(database: MockState.Database): FreeBalance.Dto {
  const accounts = database.accounts
    .filter((account) => !account.archivedAt && account.type !== 'credit_card')
    .map((account) => ({ record: account, dto: presentAccount(database, account) }));
  const withoutBalance = accounts.filter(
    (entry) => entry.record.source === 'pluggy' && entry.dto.balanceCents === null,
  );

  const items = buildAgendaItems(database, CURRENT_MONTH)
    .filter((item) => item.countsInFreeBalance && item.remainingCents > 0)
    .sort(compareAgendaItems);
  const receivableItems = items.filter((item) => item.flow === 'in');
  const payableItems = items.filter((item) => item.flow === 'out');
  const sum = (list: { remainingCents: number }[]) =>
    list.reduce((total, item) => total + item.remainingCents, 0);

  const accountsTotal = accounts.reduce((total, entry) => total + (entry.dto.balanceCents ?? 0), 0);
  const freeBalanceCents = accountsTotal + sum(receivableItems) - sum(payableItems);
  const daysRemaining = daysInMonth(CURRENT_MONTH) - dayOf(TODAY) + 1;

  const reviewByAccount = new Map<string, number>();
  for (const tx of database.transactions) {
    if (isInReview(tx))
      reviewByAccount.set(tx.accountId, (reviewByAccount.get(tx.accountId) ?? 0) + 1);
  }

  return {
    asOfOn: TODAY,
    daysRemaining,
    freeBalanceCents,
    isPartial: withoutBalance.length > 0,
    accountsWithoutBalance: withoutBalance.map((entry) => entry.record.id),
    perDayCents: Math.floor(freeBalanceCents / daysRemaining + 0.5),
    accounts: {
      totalCents: accountsTotal,
      items: accounts.map((entry) => ({
        accountId: entry.record.id,
        name: entry.record.name,
        institutionCode: entry.record.institutionCode,
        source: entry.record.source,
        balanceCents: entry.dto.balanceCents ?? 0,
      })),
    },
    receivable: { totalCents: sum(receivableItems), items: receivableItems },
    payable: { totalCents: sum(payableItems), items: payableItems },
    dataFreshness: database.connections
      .filter((connection) => connection.status !== 'disconnected')
      .map((connection) => ({
        connectionId: connection.id,
        institutionName: connection.institutionName,
        status: connection.status,
        lastBankUpdateAt: connection.lastBankUpdateAt,
        isStale: isConnectionStale(connection.lastBankUpdateAt),
      })),
    review: {
      count: [...reviewByAccount.values()].reduce((total, count) => total + count, 0),
      byAccount: [...reviewByAccount.entries()].map(([accountId, count]) => ({ accountId, count })),
    },
  };
}
