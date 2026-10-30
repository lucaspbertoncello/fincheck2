import type { TransactionMenuKey } from '@fincheck/ui';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { useByCategoryView } from '#/features/transactions/transaction-list/hooks/use-by-category-view.hook.ts';
import { useConfirmation } from '#/features/transactions/transaction-list/hooks/use-confirmation.hook.ts';
import { useFiltersView } from '#/features/transactions/transaction-list/hooks/use-filters-view.hook.ts';
import { useActionError } from '#/features/transactions/transaction-list/hooks/use-action-error.hook.ts';
import { useBulkActions } from '#/features/transactions/transaction-list/hooks/use-bulk-actions.hook.ts';
import { useDebouncedSearchText } from '#/features/transactions/transaction-list/hooks/use-debounced-search-text.hook.ts';
import { useListWindow } from '#/features/transactions/transaction-list/hooks/use-list-window.hook.ts';
import { useRowActions } from '#/features/transactions/transaction-list/hooks/use-row-actions.hook.ts';
import { useRuleQuestion } from '#/features/transactions/transaction-list/hooks/use-rule-question.hook.ts';
import { useTransactionEditing } from '#/features/transactions/transaction-list/hooks/use-transaction-editing.hook.ts';
import { useTransactionListSearch } from '#/features/transactions/transaction-list/hooks/use-transaction-list-search.hook.ts';
import { useTransactionSelection } from '#/features/transactions/transaction-list/hooks/use-transaction-selection.hook.ts';
import { useTransactionSplitting } from '#/features/transactions/transaction-list/hooks/use-transaction-splitting.hook.ts';
import { useTransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import { TransactionListView } from '#/features/transactions/transaction-list/transaction-list.view.tsx';
import type { TransactionListViewProps } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';
import {
  buildListQuery,
  countActiveFilters,
} from '#/features/transactions/transaction-list/utils/build-list-query.util.ts';
import { buildRowView } from '#/features/transactions/transaction-list/utils/build-row-view.util.ts';
import { buildTransactionLookups } from '#/features/transactions/transaction-list/utils/build-transaction-lookups.util.ts';
import { groupTransactionsByDay } from '#/features/transactions/transaction-list/utils/group-transactions-by-day.util.ts';
import { takeRows } from '#/features/transactions/transaction-list/utils/take-rows.util.ts';
import { toBusinessDate } from '#/features/transactions/transaction-list/utils/to-business-date.util.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

/**
 * Connects the Transações screen to its data: the URL state (view, type, search, filters, open
 * panel), the month list in pages, the selection mode and every action, and hands the View
 * everything ready. The creation modals ("Nova transação", "Compra parcelada") are a separate
 * feature, opened by `?new=`.
 */
export function TransactionListViewModel() {
  const router = useRouter();
  const selectedMonth = useSelectedMonth();
  const { month } = selectedMonth;
  const { search, update } = useTransactionListSearch();
  const [ruleQuestionIds, setRuleQuestionIds] = useState<string[]>([]);
  const model = useTransactionListModel({ month, search, ruleQuestionIds });
  const error = useActionError();
  const selection = useTransactionSelection();
  const searchBox = useDebouncedSearchText(search.q ?? '', (text) => update({ q: text || null }));

  const lookups = buildTransactionLookups(
    model.accounts.data?.items ?? [],
    model.categories.data?.items ?? [],
    model.tags.data?.items ?? [],
  );
  const items = model.list.data?.items ?? [];
  const today = toBusinessDate(new Date());
  const days = groupTransactionsByDay(items, today);
  const paging = useListWindow(
    items.length,
    `${month}|${JSON.stringify(buildListQuery(month, search))}`,
  );

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
  const editing = useTransactionEditing({
    model,
    lookups,
    transaction: findTransaction(search.edit),
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
    if (action === 'create-rule') go('/categories/rules');
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
    search,
    update,
    onReview: () => go('/transactions/review'),
  });

  const hasFilter = countActiveFilters(search) > 0 || search.type !== 'all' || Boolean(search.q);
  const status: TransactionListViewProps['status'] = model.list.isError
    ? 'error'
    : model.list.isSuccess
      ? 'ready'
      : 'loading';
  const categoryStatus: TransactionListViewProps['byCategoryStatus'] =
    model.breakdown.isError || model.monthSummary.isError
      ? 'error'
      : byCategory.view
        ? 'ready'
        : 'loading';

  const props: TransactionListViewProps = {
    monthLabel: selectedMonth.monthLabel.toLowerCase(),
    status,
    onRetry: () => {
      void model.list.refetch();
      void model.breakdown.refetch();
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
      typeActive: search.type !== 'all',
      onOpenFilters: filters.open,
      selectionActive: selection.active,
      selectionCount: selection.selectedIds.size,
      onToggleSelection: selection.toggleMode,
    },
    totals: model.summary.data
      ? {
          expensesCents: model.summary.data.expensesCents,
          incomesCents: model.summary.data.incomesCents,
          outsideCents: model.summary.data.outsideCents,
        }
      : null,
    reviewCount: model.summary.data?.reviewCount ?? 0,
    onReview: () => go('/transactions/review'),
    ruleQuestion,
    days: takeRows(days, paging.visibleCount).map((day) => ({
      date: day.date,
      title: day.title,
      dateLabel: day.dateLabel,
      count: day.count,
      totalCents: day.totalCents,
      rows: day.items.map((item) => buildRowView(item, lookups)),
    })),
    emptyReason: items.length === 0 ? (hasFilter ? 'filtered' : 'month') : null,
    onClearFilters: filters.clear,
    onConnectAccounts: () => go('/accounts'),
    onNewTransaction: () => update({ new: 'transaction' }),
    hasMore: paging.hasMore,
    onLoadMore: paging.loadMore,
    watchEnd: paging.watchEnd,
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
          counterparts: editing.counterparts,
          errors: editing.errors,
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
          parts: splitting.parts,
          onChange: splitting.onChange,
          categories: splitting.categories,
          createPartId: splitting.createPartId,
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
      expenseCategories: bulk.hasExpenses ? bulk.expenseCategories : [],
      incomeCategories: bulk.hasIncomes ? bulk.incomeCategories : [],
      categoryId: bulk.categoryId,
      onCategoryChange: bulk.setCategoryId,
      tags: bulk.tags.map((tag) => ({ id: tag.id, name: tag.name })),
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
