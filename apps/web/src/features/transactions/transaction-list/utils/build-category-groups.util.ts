import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { CategoryGroupData, CategoryGroupItem } from '@fincheck/ui';

import { CATEGORY_GROUP_LATEST_COUNT } from '#/features/transactions/transaction-list/constants/category-group-latest-count.constant.ts';
import { UNCATEGORIZED_GROUP_ID } from '#/features/transactions/transaction-list/constants/uncategorized-group-id.constant.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import { TRANSACTION_METHOD_LABELS } from '#/shared/constants/transactions/transaction-method-labels.constant.ts';
import { formatDayShortMonth } from '#/shared/utils/date/format-day-short-month.util.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { normalizeSearchText } from '#/shared/utils/text/normalize-search-text.util.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

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

/** A line of a group as the breakdown writes it: the transaction, or the part of a split one. */
type GroupLine = Pick<Transaction.Dto, 'id' | 'description' | 'occurredOn' | 'amountCents'>;

/** One transaction of an open group: date, name, account and the value without sign. */
function buildGroupItem(
  line: GroupLine,
  transaction: Transaction.Dto | undefined,
  lookups: TransactionLookups,
): CategoryGroupItem {
  return {
    id: line.id,
    dateLabel: formatDayShortMonth(line.occurredOn),
    name: line.description,
    accountLabel: accountLabelOf(transaction, lookups),
    cents: Math.abs(line.amountCents),
  };
}

/** What a transaction put in a category: all of it, or the part of a split one that is in it. */
function lineInCategory(transaction: Transaction.Dto, categoryId: string): GroupLine {
  const part = transaction.splits.find((split) => split.categoryId === categoryId);
  if (!part) return transaction;

  return {
    id: transaction.id,
    description: part.description ?? transaction.description,
    occurredOn: transaction.occurredOn,
    amountCents: part.amountCents,
  };
}

/** The last transactions of an income category, newest first, as the open group lists them. */
function buildIncomeItems(
  categoryId: string | null,
  incomeLatest: ReadonlyMap<string, readonly Transaction.Dto[]>,
  lookups: TransactionLookups,
): CategoryGroupItem[] {
  if (categoryId === null) return [];

  return [...(incomeLatest.get(categoryId) ?? [])]
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id))
    .slice(0, CATEGORY_GROUP_LATEST_COUNT)
    .map((transaction) =>
      buildGroupItem(lineInCategory(transaction, categoryId), transaction, lookups),
    );
}

/**
 * The "por categoria" lists as the design system draws them: the expenses (the group without a
 * category is "Para revisar") and the income sources, which open to their last transactions just
 * like the expenses (`incomeLatest`: the transactions read for each income category). The search
 * keeps the groups whose name, or whose latest transactions, contain the text.
 */
export function buildCategoryGroups(
  breakdown: CategoryBreakdown.Dto,
  lookups: TransactionLookups,
  transactionsById: ReadonlyMap<string, Transaction.Dto>,
  incomeLatest: ReadonlyMap<string, readonly Transaction.Dto[]>,
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
        items: item.latest.map((latest) =>
          buildGroupItem(
            {
              id: latest.transactionId,
              description: latest.description,
              occurredOn: latest.occurredOn,
              amountCents: latest.amountCents,
            },
            transactionsById.get(latest.transactionId),
            lookups,
          ),
        ),
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
      // Like the expenses, an income with no category is "to review"; the group opens only when it has a category.
      const uncategorized = item.categoryId === null && item.transactionCount > 0;
      const detail =
        item.receivedCents === 0
          ? `Nenhuma ainda • ${waiting ? `${waiting}, ` : ''}${formatMoney(item.expectedCents)}`
          : `${percentOfExpected}% do esperado${waiting ? ` • falta ${waiting}` : ''}`;

      return {
        id: item.categoryId ?? UNCATEGORIZED_GROUP_ID,
        name: category?.name ?? 'Para revisar',
        icon: uncategorized ? 'inbox' : mapCategoryIcon(category?.icon),
        uncategorized,
        totalCents: item.receivedCents,
        sharePercent: receivedTotal > 0 ? (item.receivedCents / receivedTotal) * 100 : 0,
        count: item.transactionCount,
        detail,
        caption:
          item.receivedCents === 0 && nextExpected
            ? `Previsto ${formatDayShortMonth(nextExpected)}`
            : undefined,
        items: buildIncomeItems(item.categoryId, incomeLatest, lookups),
      };
    })
    .filter((group) =>
      matches(search, group.name, ...(group.items ?? []).map((groupItem) => groupItem.name)),
    );

  return { expenses, incomes };
}
