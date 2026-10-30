import type { TransactionMenuKey } from '@fincheck/ui';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

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
import type {
  ByCategoryView,
  ConfirmView,
  FiltersView,
  TransactionListViewProps,
} from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';
import {
  buildCategoryGroups,
  UNCATEGORIZED_GROUP_ID,
} from '#/features/transactions/transaction-list/utils/build-category-groups.util.ts';
import { buildCategoryOptions } from '#/features/transactions/transaction-list/utils/build-category-options.util.ts';
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
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

type ConfirmState = { kind: 'delete' | 'restore-original' | 'unsplit'; id: string } | null;

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
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

  const confirm = buildConfirm();
  function buildConfirm(): ConfirmView | null {
    if (!confirmState) return null;
    const { kind, id } = confirmState;
    const name = findTransaction(id)?.description ?? 'esta transação';
    const run = async (action: () => Promise<unknown>) => {
      try {
        await action();
        if (kind !== 'restore-original') closePanels();
      } catch (caught) {
        error.report(caught);
      }
      setConfirmState(null);
    };
    const base = { onClose: () => setConfirmState(null) };

    if (kind === 'delete') {
      return {
        ...base,
        title: 'Excluir esta transação?',
        description: `“${name}” sai das contas e não dá para desfazer.`,
        confirmLabel: 'Excluir',
        destructive: true,
        loading: model.deleteTransaction.isPending,
        onConfirm: () => void run(() => rowActions.remove(id)),
      };
    }
    if (kind === 'unsplit') {
      return {
        ...base,
        title: 'Desfazer a divisão?',
        description:
          'A transação volta a ser uma só e vai para “Para revisar” até ganhar uma categoria.',
        confirmLabel: 'Desfazer a divisão',
        destructive: true,
        loading: model.unsplitTransaction.isPending,
        onConfirm: () => void run(() => model.unsplitTransaction.mutateAsync(id)),
      };
    }
    return {
      ...base,
      title: 'Restaurar o original do banco?',
      description: 'Descrição, valor e data voltam ao que o banco mandou. A sua edição se perde.',
      confirmLabel: 'Restaurar original',
      destructive: false,
      loading: model.restoreOriginal.isPending,
      onConfirm: () => void run(() => rowActions.restoreOriginal(id)),
    };
  }

  const activeCategories = [...lookups.categories.values()];
  const filters: FiltersView = {
    isOpen: filtersOpen,
    onOpenChange: setFiltersOpen,
    type: search.type,
    onTypeChange: (type) => update({ type }),
    accounts: [...lookups.accounts.values()]
      .filter((account) => account.archivedAt === null)
      .map((account) => ({ id: account.id, name: account.name })),
    accountId: search.account,
    onAccountChange: (id) => update({ account: id ?? null }),
    categories: [
      ...buildCategoryOptions(activeCategories, 'expense'),
      ...buildCategoryOptions(activeCategories, 'income'),
    ],
    categoryId: search.category,
    onCategoryChange: (id) => update({ category: id ?? null, uncategorized: null }),
    tags: [...lookups.tags.values()]
      .filter((tag) => tag.archivedAt === null)
      .map((tag) => ({ id: tag.id, name: tag.name })),
    tagId: search.tag,
    onTagChange: (id) => update({ tag: id ?? null }),
    uncategorized: search.uncategorized ?? false,
    onUncategorizedChange: (value) => update({ uncategorized: value || null }),
    canClear: countActiveFilters(search) > 0 || search.type !== 'all',
    onClear: clearFilters,
  };

  function clearFilters() {
    update({ account: null, category: null, tag: null, uncategorized: null, type: 'all', q: null });
  }

  const byCategory = buildByCategory();
  function buildByCategory(): { view: ByCategoryView | null; empty: boolean } {
    const breakdown = model.breakdown.data;
    const monthSummary = model.monthSummary.data;
    if (!breakdown || !monthSummary) return { view: null, empty: false };
    const transactionsById = new Map(
      (model.monthTransactions.data?.items ?? []).map((item) => [item.id, item]),
    );
    const groups = buildCategoryGroups(breakdown, lookups, transactionsById, search.q ?? '');

    return {
      empty: Boolean(search.q) && groups.expenses.length === 0 && groups.incomes.length === 0,
      view: {
        expenseCard: {
          spentCents: monthSummary.expenses.spentCents,
          previousSamePointCents: monthSummary.expenses.previousSpentCents,
          previousTotalCents: breakdown.expenses.previousTotalCents,
          previousMonthLabel: formatMonthParts(shiftMonthKey(month, -1)).monthLabel.toLowerCase(),
        },
        incomeCard: {
          receivedCents: breakdown.incomes.receivedCents,
          expectedCents: breakdown.incomes.expectedCents,
        },
        expenses: groups.expenses,
        expensesTotalCents: breakdown.expenses.totalCents,
        incomes: groups.incomes,
        incomesTotalCents: breakdown.incomes.receivedCents,
        showExpenses: search.type !== 'income',
        showIncomes: search.type !== 'expense',
        openGroupId,
        onOpenGroupChange: (id, open) => setOpenGroupId(open ? id : null),
        onSeeAll: (id) =>
          update({
            view: 'list',
            q: null,
            category: id === UNCATEGORIZED_GROUP_ID ? null : id,
            uncategorized: id === UNCATEGORIZED_GROUP_ID ? true : null,
          }),
        onReview: () => go('/transactions/review'),
      },
    };
  }

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
      onOpenFilters: () => setFiltersOpen(true),
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
    onClearFilters: clearFilters,
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
          onRestoreOriginal: () =>
            setConfirmState({ kind: 'restore-original', id: editing.transactionId }),
          onDelete: () => setConfirmState({ kind: 'delete', id: editing.transactionId }),
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
          onUnsplit: () => setConfirmState({ kind: 'unsplit', id: splitting.transactionId }),
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
      onRestoreOriginal: (id) => setConfirmState({ kind: 'restore-original', id }),
    },
    filters,
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
    confirm,
  };

  return <TransactionListView {...props} />;
}
