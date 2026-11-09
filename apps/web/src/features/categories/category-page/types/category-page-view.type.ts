import type { ConfirmChange, IconName, MonthBar } from '@fincheck/ui';
import type { ReactNode } from 'react';

import type { CategoryFormTarget } from '#/features/categories/types/category-form.type.ts';
import type {
  TransactionMonthView,
  TransactionRowHandlers,
} from '#/shared/types/transactions/transaction-list-view.type.ts';

export type CategoryPageKind = 'expense' | 'income';

/** Part of the page that loads on its own: the figures, the bars and the list. */
export type PartStatus = 'loading' | 'error' | 'ready';

export type CategoryFiguresView = {
  /** "Gasto no período" or "Recebido no período". */
  totalLabel: string;
  totalCents: number;
  /** Null where the contract has no count for the period: the page writes a dash. */
  transactionCount: number | null;
  /** Null for "Tudo": a dash. */
  monthlyAverageCents: number | null;
};

type CategoryTrendView = {
  title: string;
  valueLabel: string;
  bars: MonthBar[];
  highlightKey: string;
  emptyMessage: string;
};

type CategoryEmptyView = {
  title: string;
  description: string;
  /** Only where a wider period would show something else. */
  onShowAll: (() => void) | null;
};

export type CategoryArchiveDialogView = {
  title: string;
  description: string;
  changes: ConfirmChange[];
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export type CategoryPageViewProps = {
  /** Whether the category is known: while the catalog loads or fails, or when it does not exist. */
  status: 'loading' | 'error' | 'not-found' | 'ready';
  onRetry: () => void;
  /** Where "Categorias" in the header goes (the tab of the category). */
  backHref: string;
  /** The same way back, as an action (the empty state of a category that does not exist). */
  onBack: () => void;
  name: string;
  kind: CategoryPageKind;
  /** "Categoria de despesa". */
  description: string;
  icon: IconName;
  archived: boolean;
  /** A transfer between own accounts ("Rotação entre contas"): it does not count as spending. */
  isTransfer: boolean;
  /** The header picker: the month and the period menu of Transações. */
  picker: ReactNode;
  actionError: { message: string; onClose: () => void } | null;
  onEdit: () => void;
  figuresStatus: PartStatus;
  figures: CategoryFiguresView | null;
  trendStatus: PartStatus;
  trend: CategoryTrendView | null;
  listStatus: PartStatus;
  months: TransactionMonthView[];
  empty: CategoryEmptyView | null;
  rowHandlers: TransactionRowHandlers;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  watchEnd: (node: HTMLDivElement | null) => void;
  form: {
    target: CategoryFormTarget | null;
    onClose: () => void;
    onArchive: (id: string) => void;
    onRestore: (id: string) => void;
  };
  archiveDialog: CategoryArchiveDialogView | null;
};
