import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { CategoryGroupData } from '@fincheck/ui';

import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';
import { TRANSACTION_METHOD_LABELS } from '#/features/transactions/transaction-list/constants/transaction-method-labels.constant.ts';
import { formatShortDate } from '#/features/transactions/transaction-list/utils/format-day-heading.util.ts';
import { mapCategoryIcon } from '#/features/transactions/transaction-list/utils/map-category-icon.util.ts';
import { normalizeSearchText } from '#/features/transactions/transaction-list/utils/normalize-search-text.util.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

export const UNCATEGORIZED_GROUP_ID = 'uncategorized';

type CategoryGroups = {
  expenses: CategoryGroupData[];
  incomes: CategoryGroupData[];
};

function accountLabelOf(
  transaction: Transaction.Dto | undefined,
  lookups: TransactionLookups,
): string {
  if (!transaction) return '';
  const account = lookups.accounts.get(transaction.accountId);
  const method = TRANSACTION_METHOD_LABELS[transaction.method];
  return account ? `${account.name}, ${method}` : method;
}

function matches(search: string, ...texts: string[]): boolean {
  return search === '' || texts.some((text) => normalizeSearchText(text).includes(search));
}

/**
 * The "por categoria" lists as the design system draws them: the expenses (the group without a
 * category is "Para revisar") and the income sources. The search keeps the groups whose name, or
 * whose latest transactions, contain the text.
 */
export function buildCategoryGroups(
  breakdown: CategoryBreakdown.Dto,
  lookups: TransactionLookups,
  transactionsById: ReadonlyMap<string, Transaction.Dto>,
  searchText: string,
): CategoryGroups {
  const search = normalizeSearchText(searchText);

  const expenses = breakdown.expenses.items
    .map((item): CategoryGroupData => {
      const category = item.categoryId ? lookups.categories.get(item.categoryId) : undefined;
      const uncategorized = item.categoryId === null;

      return {
        id: item.categoryId ?? UNCATEGORIZED_GROUP_ID,
        name: uncategorized ? 'Para revisar' : (category?.name ?? 'Categoria removida'),
        icon: uncategorized ? 'inbox' : mapCategoryIcon(category?.icon),
        uncategorized,
        totalCents: item.spentCents,
        sharePercent: item.sharePct ?? 0,
        count: item.transactionCount,
        variationPercent: uncategorized ? undefined : (item.changePct ?? undefined),
        items: item.latest.map((latest) => ({
          id: latest.transactionId,
          dateLabel: formatShortDate(latest.occurredOn),
          name: latest.description,
          accountLabel: accountLabelOf(transactionsById.get(latest.transactionId), lookups),
          cents: Math.abs(latest.amountCents),
        })),
      };
    })
    .filter((group) =>
      matches(search, group.name, ...(group.items ?? []).map((item) => item.name)),
    );

  const receivedTotal = breakdown.incomes.receivedCents;
  const incomes = breakdown.incomes.items
    .map((item): CategoryGroupData => {
      const category = item.categoryId ? lookups.categories.get(item.categoryId) : undefined;
      const waiting = item.pending.map((pending) => pending.recurrenceName).join(', ');
      const percentOfExpected =
        item.expectedCents > 0 ? Math.round((item.receivedCents / item.expectedCents) * 100) : 100;
      const nextExpected = item.pending.find((pending) => pending.expectedOn)?.expectedOn;
      const detail =
        item.receivedCents === 0
          ? `Nenhuma ainda • ${waiting ? `${waiting}, ` : ''}${formatMoney(item.expectedCents)}`
          : `${percentOfExpected}% do esperado${waiting ? ` • falta ${waiting}` : ''}`;

      return {
        id: item.categoryId ?? UNCATEGORIZED_GROUP_ID,
        name: category?.name ?? 'Outras receitas',
        icon: mapCategoryIcon(category?.icon),
        totalCents: item.receivedCents,
        sharePercent: receivedTotal > 0 ? (item.receivedCents / receivedTotal) * 100 : 0,
        count: 0,
        detail,
        caption:
          item.receivedCents === 0 && nextExpected
            ? `Previsto ${formatShortDate(nextExpected)}`
            : undefined,
      };
    })
    .filter((group) => matches(search, group.name));

  return { expenses, incomes };
}
