import type { TransactionMenuKey } from '@fincheck/ui';
import { useRouter } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { useByCategoryView } from '#/features/transactions/transaction-list/hooks/use-by-category-view.hook.ts';
import { useConfirmation } from '#/features/transactions/transaction-list/hooks/use-confirmation.hook.ts';
import { useFiltersView } from '#/features/transactions/transaction-list/hooks/use-filters-view.hook.ts';
import { useActionError } from '#/shared/hooks/transactions/use-action-error.hook.ts';
import { useBulkActions } from '#/features/transactions/transaction-list/hooks/use-bulk-actions.hook.ts';
import { useEditTarget } from '#/features/transactions/transaction-list/hooks/use-edit-target.hook.ts';
import { useDebouncedSearchText } from '#/features/transactions/transaction-list/hooks/use-debounced-search-text.hook.ts';
import { useSyncFailures } from '#/features/transactions/transaction-list/hooks/use-sync-failures.hook.ts';
import { useEndOfList } from '#/shared/hooks/transactions/use-end-of-list.hook.ts';
import { useListWindow } from '#/features/transactions/transaction-list/hooks/use-list-window.hook.ts';
import { useRowActions } from '#/features/transactions/transaction-list/hooks/use-row-actions.hook.ts';
import { useRuleQuestion } from '#/features/transactions/transaction-list/hooks/use-rule-question.hook.ts';
import { useTransactionEditing } from '#/features/transactions/transaction-list/hooks/use-transaction-editing.hook.ts';
import { useTransactionListSearch } from '#/shared/hooks/transactions/use-transaction-list-search.hook.ts';
import { useTransactionSelection } from '#/features/transactions/transaction-list/hooks/use-transaction-selection.hook.ts';
import { useTransactionSplitting } from '#/features/transactions/transaction-list/hooks/use-transaction-splitting.hook.ts';
import { useTransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import { TransactionListView } from '#/features/transactions/transaction-list/transaction-list.view.tsx';
import type { TransactionListViewProps } from '#/shared/types/transactions/transaction-list-view.type.ts';
import { buildListQuery } from '#/features/transactions/transaction-list/utils/build-list-query.util.ts';
import { countActiveFilters } from '#/features/transactions/transaction-list/utils/count-active-filters.util.ts';
import { buildRowView } from '#/shared/utils/transactions/build-row-view.util.ts';
import { buildTransactionLookups } from '#/shared/utils/transactions/build-transaction-lookups.util.ts';
import { describeEmptyPeriod } from '#/features/transactions/transaction-list/utils/describe-empty-period.util.ts';
import { groupDaysByMonth } from '#/shared/utils/transactions/group-days-by-month.util.ts';
import { resolvePeriodRange } from '#/shared/utils/transactions/resolve-period-range.util.ts';
import { groupTransactionsByDay } from '#/shared/utils/transactions/group-transactions-by-day.util.ts';
import { rankCategoriesByUse } from '#/features/transactions/utils/rank-categories-by-use.util.ts';
import { formatDayChip } from '#/features/transactions/transaction-list/utils/format-day-chip.util.ts';
import { takeRows } from '#/features/transactions/transaction-list/utils/take-rows.util.ts';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

/**
 * Connects the Transações screen to its data: the URL state (view, type, search, filters, open
 * panel), the month list in pages, the selection mode and every action, and hands the View
 * everything ready. The edit, split and bulk modals open over the list. The creation modals ("Nova transação", "Compra parcelada") are a separate
 * feature, opened by `?new=`.
 */
export function TransactionListViewModel() {
  const router = useRouter();
  const selectedMonth = useSelectedMonth();
  const { month } = selectedMonth;
  const { search, update } = useTransactionListSearch();
  const [ruleQuestionIds, setRuleQuestionIds] = useState<string[]>([]);
  const today = getBusinessDate(new Date());
  // "Mês" is the month of the app; the wider periods read their own range (BR-TRX-007).
  const isMonth = search.period === 'month';
  const range = resolvePeriodRange(search.period, today);
  const model = useTransactionListModel({ month, range, search, ruleQuestionIds });
  const error = useActionError();
  const syncFailures = useSyncFailures({ model, reportError: error.report });
  const selection = useTransactionSelection();
  const searchBox = useDebouncedSearchText(search.q ?? '', (text) => update({ q: text || null }));

  const lookups = buildTransactionLookups(
    model.accounts.data?.items ?? [],
    model.categories.data?.items ?? [],
    model.tags.data?.items ?? [],
  );
  const periodPages = model.periodList.data?.pages;
  const periodItems = useMemo(
    () => periodPages?.flatMap((page) => page.items) ?? [],
    [periodPages],
  );
  const items = isMonth ? (model.list.data?.items ?? []) : periodItems;
  // `?day=` narrows the month already loaded to one day (the contract has no day filter); a wider
  // period is read page by page, so the day does not apply to it.
  const dayOfMonth = isMonth ? search.day : undefined;
  const visibleItems = dayOfMonth ? items.filter((item) => item.occurredOn === dayOfMonth) : items;
  const days = groupTransactionsByDay(visibleItems, today);
  // The month shows a window of its list; a wider period asks the API for the next page instead.
  const paging = useListWindow(
    isMonth ? visibleItems.length : 0,
    `${month}|${search.day ?? ''}|${JSON.stringify(buildListQuery(month, search))}`,
  );
  const periodEnd = useEndOfList({
    hasMore: !isMonth && Boolean(model.periodList.hasNextPage),
    loading: model.periodList.isFetchingNextPage,
    pageCount: periodPages?.length ?? 0,
    onLoadMore: () => void model.periodList.fetchNextPage(),
  });

  const rowActions = useRowActions({
    model,
    lookups,
    askRule: setRuleQuestionIds,
    reportError: error.report,
  });
  const ruleQuestion = useRuleQuestion({
    model,
    lookups,
    ids: ruleQuestionIds,
    clear: () => setRuleQuestionIds([]),
  });
  const bulk = useBulkActions({
    model,
    lookups,
    selectedIds: selection.selectedIds,
    transactions: items,
    finish: selection.finish,
    askRule: setRuleQuestionIds,
    reportError: error.report,
  });

  const findTransaction = (id: string | undefined) =>
    id
      ? (items.find((item) => item.id === id) ??
        model.monthTransactions.data?.items.find((item) => item.id === id))
      : undefined;
  const closePanels = () => update({ edit: null, split: null });
  const editTarget = useEditTarget({
    id: search.edit,
    found: findTransaction(search.edit),
    clear: () => update({ edit: null }),
  });
  const editing = useTransactionEditing({
    model,
    lookups,
    transaction: editTarget,
    close: closePanels,
    recategorize: rowActions.recategorize,
    askRule: setRuleQuestionIds,
  });
  const splitting = useTransactionSplitting({
    model,
    lookups,
    transaction: findTransaction(search.split),
    close: closePanels,
  });

  function go(path: string) {
    navigateToHref(router, buildHref(path, month));
  }

  function handleMenuAction(id: string, action: TransactionMenuKey) {
    if (action === 'edit') update({ edit: id, split: null });
    if (action === 'split') update({ split: id, edit: null });
    if (action === 'ignore') void rowActions.ignore(id);
    if (action === 'restore') void rowActions.bringBack(id);
    if (action === 'create-rule') go(`/categories/rules?new=rule&from=${id}`);
    if (action === 'create-recurrence') go('/recurrences');
  }

  const confirmation = useConfirmation({
    model,
    rowActions,
    findTransaction,
    closePanels,
    reportError: error.report,
  });

  const filters = useFiltersView({ lookups, search, update });
  const byCategory = useByCategoryView({
    model,
    lookups,
    month,
    range,
    search,
    update,
    onReview: () => go('/transactions/review'),
  });

  const hasFilter = countActiveFilters(search) > 0 || search.type !== 'all' || Boolean(search.q);
  const activeList = isMonth ? model.list : model.periodList;
  const status: TransactionListViewProps['status'] = activeList.isError
    ? 'error'
    : activeList.isSuccess
      ? 'ready'
      : 'loading';
  const categoryFailed = isMonth
    ? model.breakdown.isError || model.monthSummary.isError
    : model.periodBreakdown.isError;
  const categoryStatus: TransactionListViewProps['byCategoryStatus'] = categoryFailed
    ? 'error'
    : byCategory.view
      ? 'ready'
      : 'loading';

  function buildDayView(day: (typeof days)[number]) {
    return {
      date: day.date,
      title: day.title,
      dateLabel: day.dateLabel,
      count: day.count,
      totalCents: day.totalCents,
      rows: day.items.map((item) => buildRowView(item, lookups)),
    };
  }

  function buildTotals(): TransactionListViewProps['totals'] {
    if (isMonth) {
      const summary = model.summary.data;
      if (!summary) return null;

      return {
        label: 'Totais do mês',
        expensesCents: summary.expensesCents,
        incomesCents: summary.incomesCents,
        outsideCents: summary.outsideCents,
      };
    }
    const breakdown = model.periodBreakdown.data;
    if (!breakdown) return null;

    return {
      label: 'Totais do período',
      expensesCents: breakdown.expenses.totalCents,
      incomesCents: breakdown.incomes.receivedCents,
      outsideCents: null,
    };
  }

  const props: TransactionListViewProps = {
    emptyTitle: describeEmptyPeriod(search.period, range, selectedMonth.monthLabel.toLowerCase()),
    status,
    onRetry: () => {
      void activeList.refetch();
      void (isMonth ? model.breakdown : model.periodBreakdown).refetch();
      void model.monthSummary.refetch();
    },
    actionError: error.message ? { message: error.message, onClose: error.clear } : null,
    controls: {
      view: search.view,
      onViewChange: (view) => update({ view }),
      type: search.type,
      onTypeChange: (type) => update({ type }),
      searchText: searchBox.text,
      onSearchTextChange: searchBox.setText,
      activeFilterCount: countActiveFilters(search),
      onOpenFilters: filters.open,
      selectionActive: selection.active,
      selectionCount: selection.selectedIds.size,
      onToggleSelection: selection.toggleMode,
    },
    totals: buildTotals(),
    reviewCount: isMonth
      ? (model.summary.data?.reviewCount ?? 0)
      : (model.periodBreakdown.data?.review.count ?? 0),
    onReview: () => go('/transactions/review'),
    ruleQuestion,
    days: (isMonth ? takeRows(days, paging.visibleCount) : days).map(buildDayView),
    months: isMonth
      ? null
      : groupDaysByMonth(days).map((month) => ({
          key: month.key,
          label: month.label,
          countLabel: countWord(month.count, 'transação', 'transações'),
          days: month.days.map(buildDayView),
        })),
    emptyReason:
      items.length === 0
        ? hasFilter
          ? 'filtered'
          : 'month'
        : visibleItems.length === 0
          ? 'day'
          : null,
    dayFilter: dayOfMonth
      ? { label: `Dia ${formatDayChip(dayOfMonth)}`, onClear: () => update({ day: null }) }
      : null,
    syncFailures,
    onClearFilters: filters.clear,
    onConnectAccounts: () => go('/accounts'),
    onNewTransaction: () => update({ new: 'transaction' }),
    hasMore: isMonth ? paging.hasMore : Boolean(model.periodList.hasNextPage),
    loadingMore: !isMonth && model.periodList.isFetchingNextPage,
    onLoadMore: isMonth ? paging.loadMore : () => void model.periodList.fetchNextPage(),
    watchEnd: isMonth ? paging.watchEnd : periodEnd,
    byCategory: byCategory.view,
    byCategoryStatus: categoryStatus,
    byCategoryEmpty: byCategory.empty,
    selectionActive: selection.active,
    selectedIds: selection.selectedIds,
    onSelectionAction: bulk.onAction,
    onSelectionClose: selection.finish,
    editor: editing
      ? {
          transactionId: editing.transactionId,
          values: editing.values,
          onChange: editing.onChange,
          categories: editing.categories,
          transferCategories: editing.transferCategories,
          counterparts: editing.counterparts,
          tagPicker: editing.tagPicker,
          errors: editing.errors,
          description: editing.description,
          direction: editing.direction,
          formError: editing.formError,
          original: editing.original,
          saving: editing.saving,
          canDelete: editing.canDelete,
          onSave: () => void editing.save(),
          onCancel: closePanels,
          onRestoreOriginal: () => confirmation.ask('restore-original', editing.transactionId),
          onDelete: () => confirmation.ask('delete', editing.transactionId),
        }
      : null,
    splitter: splitting
      ? {
          transactionId: splitting.transactionId,
          totalCents: splitting.totalCents,
          kind: splitting.kind,
          parts: splitting.parts,
          check: splitting.check,
          onAmountChange: splitting.changeAmount,
          onCategoryChange: splitting.changeCategory,
          onEvenSplit: splitting.evenSplit,
          categories: splitting.categories,
          createPartId: splitting.createPartId,
          description: splitting.description,
          saving: splitting.saving,
          error: splitting.error,
          isSplit: splitting.isSplit,
          onConfirm: () => void splitting.confirm(),
          onCancel: closePanels,
          onUnsplit: () => confirmation.ask('unsplit', splitting.transactionId),
        }
      : null,
    rowHandlers: {
      onMenuAction: handleMenuAction,
      onSelectedChange: selection.setSelected,
      onAcceptSuggestion: (id, categoryId) => {
        const transaction = findTransaction(id);
        if (transaction)
          void rowActions.recategorize(transaction, categoryId).catch(() => undefined);
      },
      onChooseOtherCategory: (id) => update({ edit: id, split: null }),
      onResolveBankChange: (id, use) => void rowActions.resolveBankChange(id, use),
      onRestoreOriginal: (id) => confirmation.ask('restore-original', id),
    },
    filters: filters.view,
    bulkPicker: {
      picker: bulk.picker,
      count: selection.selectedIds.size,
      expenseCategories: bulk.hasExpenses ? rankCategoriesByUse(bulk.expenseCategories, items) : [],
      incomeCategories: bulk.hasIncomes ? rankCategoriesByUse(bulk.incomeCategories, items) : [],
      categoryId: bulk.categoryId,
      onCategoryChange: bulk.setCategoryId,
      tags: bulk.tags.map((tag) => ({
        id: tag.id,
        name: `${tag.name} · ${lookups.categories.get(tag.categoryId)?.name ?? 'sem categoria'}`,
      })),
      tagId: bulk.tagId,
      onTagChange: bulk.setTagId,
      pending: bulk.pending,
      onApply: bulk.apply,
      onClose: bulk.close,
    },
    confirm: confirmation.view,
  };

  return <TransactionListView {...props} />;
}
