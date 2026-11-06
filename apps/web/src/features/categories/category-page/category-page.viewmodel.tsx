import { useToast } from '@fincheck/ui';
import { useParams, useRouter } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { buildArchiveCategoryImpact } from '#/features/categories/utils/build-archive-category-impact.util.ts';
import { useCategoryPageModel } from '#/features/categories/category-page/category-page.model.ts';
import { CategoryPageView } from '#/features/categories/category-page/category-page.view.tsx';
import { useCategoryRowActions } from '#/features/categories/category-page/hooks/use-category-row-actions.hook.ts';
import type {
  CategoryArchiveDialogView,
  CategoryPageViewProps,
} from '#/features/categories/category-page/types/category-page-view.type.ts';
import { buildCategoryFigures } from '#/features/categories/category-page/utils/build-category-figures.util.ts';
import { buildMonthViews } from '#/features/categories/category-page/utils/build-month-views.util.ts';
import { buildTrendBars } from '#/features/categories/category-page/utils/build-trend-bars.util.ts';
import { describeEmptyCategoryPeriod } from '#/features/categories/category-page/utils/describe-empty-category-period.util.ts';
import { resolveCategoryRange } from '#/features/categories/category-page/utils/resolve-category-range.util.ts';
import { TransactionPeriodPickerViewModel } from '#/shared/components/transactions/transaction-period-picker.viewmodel.tsx';
import { useActionError } from '#/shared/hooks/transactions/use-action-error.hook.ts';
import { useEndOfList } from '#/shared/hooks/transactions/use-end-of-list.hook.ts';
import { useTransactionListSearch } from '#/shared/hooks/transactions/use-transaction-list-search.hook.ts';
import { buildTransactionLookups } from '#/shared/utils/transactions/build-transaction-lookups.util.ts';
import { groupTransactionsByDay } from '#/shared/utils/transactions/group-transactions-by-day.util.ts';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';

/**
 * Connects the category page (BR-CAT-010) to its data: the category from the URL, the period (the
 * same `?period=` of Transações, with the month of the app), the figures, the 12 bars and the
 * transactions of the category page by page. Editing and archiving use the modals of the list.
 */
export function CategoryPageViewModel() {
  const { id = '' } = useParams({ strict: false });
  const { month, monthLabel, yearLabel } = useSelectedMonth();
  const { monthParam } = useActiveScreen();
  const { search, update } = useTransactionListSearch();
  const toast = useToast();
  const router = useRouter();
  const error = useActionError();
  const [editing, setEditing] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const today = getBusinessDate(new Date());
  const range = resolveCategoryRange(search.period, month, today);
  const model = useCategoryPageModel({ categoryId: id, range });
  const { category } = model;

  const lookups = buildTransactionLookups(
    model.accounts.data?.items ?? [],
    model.categories.data?.items ?? [],
    model.tags.data?.items ?? [],
  );
  const pages = model.list.data?.pages;
  const items = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const months = buildMonthViews(groupTransactionsByDay(items, today), lookups);
  const rowHandlers = useCategoryRowActions({
    model,
    transactions: items,
    reportError: error.report,
  });
  const watchEnd = useEndOfList({
    hasMore: Boolean(model.list.hasNextPage),
    loading: model.list.isFetchingNextPage,
    pageCount: pages?.length ?? 0,
    onLoadMore: () => void model.list.fetchNextPage(),
  });

  const status: CategoryPageViewProps['status'] = model.categories.isError
    ? 'error'
    : model.categories.isPending
      ? 'loading'
      : category
        ? 'ready'
        : 'not-found';
  const kind = category?.kind ?? 'expense';
  const isExpense = kind === 'expense';
  const kindWord = isExpense ? 'Gasto' : 'Recebido';

  const figures =
    category && model.breakdown.data
      ? buildCategoryFigures({
          kind,
          categoryId: category.id,
          period: search.period,
          range,
          today,
          breakdown: model.breakdown.data,
        })
      : null;

  async function moveCategory(direction: 'archive' | 'restore') {
    if (!category) return;
    const mutation = direction === 'archive' ? model.archiveCategory : model.unarchiveCategory;
    const opposite = direction === 'archive' ? model.unarchiveCategory : model.archiveCategory;
    await mutation.mutateAsync(category.id);
    setArchiveOpen(false);
    toast.showUndoToast({
      message:
        direction === 'archive'
          ? `${category.name} arquivada. Sai da escolha de categoria.`
          : `${category.name} voltou para a escolha de categoria.`,
      onUndo: () => {
        opposite
          .mutateAsync(category.id)
          .catch(() => error.report(new Error('Não deu para desfazer. Tente de novo.')));
      },
      withIcon: true,
    });
  }

  async function confirmArchive() {
    setArchiveError(null);
    try {
      await moveCategory('archive');
    } catch {
      setArchiveError('Não deu para arquivar agora. Tente de novo.');
    }
  }

  const archiveDialog: CategoryArchiveDialogView | null =
    archiveOpen && category
      ? {
          title: `Arquivar ${category.name}?`,
          description:
            archiveError ?? 'Arquivar só tira a categoria da escolha. Nada do histórico muda.',
          changes: buildArchiveCategoryImpact(category),
          confirmLabel: archiveError ? 'Tentar de novo' : 'Arquivar',
          loading: model.archiveCategory.isPending,
          onConfirm: () => void confirmArchive(),
          onClose: () => setArchiveOpen(false),
        }
      : null;

  const listStatus = model.list.isError ? 'error' : model.list.isSuccess ? 'ready' : 'loading';
  const backPath = kind === 'income' ? '/categories?filter=income' : '/categories';

  const props: CategoryPageViewProps = {
    status,
    onRetry: () => {
      void model.categories.refetch();
      void model.breakdown.refetch();
      void model.trend.refetch();
      void model.list.refetch();
    },
    backHref: buildHref(backPath, monthParam),
    onBack: () => navigateToHref(router, buildHref(backPath, monthParam)),
    name: category?.name ?? '',
    kind,
    description: `Categoria de ${isExpense ? 'despesa' : 'receita'}${category?.archivedAt ? ' · arquivada' : ''}`,
    icon: mapCategoryIcon(category?.icon),
    archived: Boolean(category?.archivedAt),
    picker: <TransactionPeriodPickerViewModel />,
    actionError: error.message ? { message: error.message, onClose: error.clear } : null,
    onEdit: () => setEditing(true),
    figuresStatus: model.breakdown.isError ? 'error' : figures ? 'ready' : 'loading',
    figures: figures ? { totalLabel: `${kindWord} no período`, ...figures } : null,
    trendStatus: model.trend.isError ? 'error' : model.trend.data ? 'ready' : 'loading',
    trend: model.trend.data
      ? {
          title: `${kindWord} por mês em ${category?.name ?? ''}`,
          valueLabel: kindWord,
          bars: buildTrendBars(model.trend.data.months),
          highlightKey: today.slice(0, 7),
          emptyMessage: `Sem ${isExpense ? 'gasto' : 'recebido'} nos últimos 12 meses`,
        }
      : null,
    listStatus,
    months,
    empty:
      listStatus === 'ready' && items.length === 0
        ? {
            title: describeEmptyCategoryPeriod(
              search.period,
              `${monthLabel.toLowerCase()} de ${yearLabel}`,
              yearLabel,
            ),
            description: `Nenhuma transação de ${category?.name ?? 'a categoria'} neste período.`,
            onShowAll: search.period === 'all' ? null : () => update({ period: 'all' }),
          }
        : null,
    rowHandlers,
    hasMore: Boolean(model.list.hasNextPage),
    loadingMore: model.list.isFetchingNextPage,
    onLoadMore: () => void model.list.fetchNextPage(),
    watchEnd,
    form: {
      target: editing && category ? { mode: 'edit', category } : null,
      onClose: () => setEditing(false),
      // The modal gives way to the confirmation, which carries the impact of the archive.
      onArchive: () => {
        setEditing(false);
        setArchiveError(null);
        setArchiveOpen(true);
      },
      onRestore: () => {
        moveCategory('restore').catch(() =>
          error.report(new Error(`Não deu para desarquivar ${category?.name ?? ''}.`)),
        );
      },
    },
    archiveDialog,
  };

  return <CategoryPageView {...props} />;
}
