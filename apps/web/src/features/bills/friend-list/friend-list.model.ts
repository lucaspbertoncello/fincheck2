import { useBills } from '#/domain/bills/bill/hooks/use-bills.hook.ts';
import { listFoundFriendPayments } from '#/domain/bills/bill/rules/list-found-friend-payments.rule.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useAgenda } from '#/domain/dashboard/agenda/hooks/use-agenda.hook.ts';
import { useTransactionsByIds } from '#/domain/transactions/transaction/hooks/use-transactions-by-ids.hook.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

/**
 * What the Amigos tab reads: every friend debt, settled ones included, the categories for the
 * icons and, as a complement, the agenda: the Pix it found for a debt and the transaction of each
 * one (for the date). Without the agenda the tab has no such lines and works as before.
 */
export function useFriendListModel() {
  const { month } = useSelectedMonth();
  const agenda = useAgenda(month);
  const foundPayments = listFoundFriendPayments(agenda.data?.receivable ?? []);
  const transactions = useTransactionsByIds(
    [...foundPayments.values()].flatMap((found) => found.map((entry) => entry.transactionId)),
  );

  return {
    bills: useBills({ kind: 'friend', status: 'all' }),
    categories: useCategories({ status: 'all' }),
    foundPayments,
    transactions,
  };
}
