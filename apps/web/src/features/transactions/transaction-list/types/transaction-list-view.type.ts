import type {
  CategoryGroupData,
  CategoryOption,
  CounterpartOption,
  OriginalFromBank,
  SelectionAction,
  SplitPart,
  TransactionEditErrors,
  TransactionEditValues,
  TransactionMenuKey,
  TransactionRowData,
} from '@fincheck/ui';

export type ListViewMode = 'list' | 'category';
export type ListTypeFilter = 'all' | 'expense' | 'income';

/** What shows under a row, besides the edit and split panels. */
export type RowDetailView =
  | {
      kind: 'edited';
      bankName: string;
      bankCents: number;
      yourName: string;
      yourCents: number;
      note?: string;
    }
  | {
      kind: 'bank-change';
      /** Set when the bank changed the amount; otherwise `text` says what changed. */
      amount?: { before: number; after: number };
      text?: string;
      bankName: string;
      bankCents: number;
      yourName: string;
      yourCents: number;
    }
  | { kind: 'bank-removed' }
  | { kind: 'suggestion'; category: CategoryOption };

export type TransactionRowView = {
  row: TransactionRowData;
  details: RowDetailView[];
};

export type TransactionDayView = {
  date: string;
  title: string;
  dateLabel: string;
  count: number;
  totalCents: number;
  rows: TransactionRowView[];
};

export type TransactionEditorView = {
  transactionId: string;
  values: TransactionEditValues;
  onChange: (values: TransactionEditValues) => void;
  categories: CategoryOption[];
  counterparts: CounterpartOption[];
  errors: TransactionEditErrors;
  formError?: string;
  original?: OriginalFromBank;
  saving: boolean;
  canDelete: boolean;
  onSave: () => void;
  onCancel: () => void;
  onRestoreOriginal: () => void;
  onDelete: () => void;
};

export type TransactionSplitterView = {
  transactionId: string;
  totalCents: number;
  parts: SplitPart[];
  onChange: (parts: SplitPart[]) => void;
  categories: CategoryOption[];
  createPartId: () => string;
  saving: boolean;
  error?: string;
  isSplit: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onUnsplit: () => void;
};

export type TransactionRowHandlers = {
  onMenuAction: (id: string, action: TransactionMenuKey) => void;
  onSelectedChange: (id: string, selected: boolean) => void;
  onAcceptSuggestion: (id: string, categoryId: string) => void;
  onChooseOtherCategory: (id: string) => void;
  onResolveBankChange: (id: string, use: 'bank' | 'mine') => void;
  onRestoreOriginal: (id: string) => void;
};

export type ListControlsView = {
  view: ListViewMode;
  onViewChange: (view: ListViewMode) => void;
  type: ListTypeFilter;
  onTypeChange: (type: ListTypeFilter) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  /** Filters of the "Filtros" panel that are on, and whether the type is not "Todas". */
  activeFilterCount: number;
  typeActive: boolean;
  onOpenFilters: () => void;
  selectionActive: boolean;
  selectionCount: number;
  onToggleSelection: () => void;
};

export type MonthTotalsView = {
  expensesCents: number;
  incomesCents: number;
  outsideCents: number;
};

export type ByCategoryView = {
  expenseCard: {
    spentCents: number;
    previousSamePointCents: number;
    previousTotalCents: number;
    previousMonthLabel: string;
  };
  incomeCard: { receivedCents: number; expectedCents: number };
  expenses: CategoryGroupData[];
  expensesTotalCents: number;
  incomes: CategoryGroupData[];
  incomesTotalCents: number;
  showExpenses: boolean;
  showIncomes: boolean;
  openGroupId: string | null;
  onOpenGroupChange: (id: string, open: boolean) => void;
  onSeeAll: (id: string) => void;
  onReview: () => void;
};

export type FiltersView = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  type: ListTypeFilter;
  onTypeChange: (type: ListTypeFilter) => void;
  accounts: { id: string; name: string }[];
  accountId: string | undefined;
  onAccountChange: (id: string | undefined) => void;
  categories: CategoryOption[];
  categoryId: string | undefined;
  onCategoryChange: (id: string | undefined) => void;
  tags: { id: string; name: string }[];
  tagId: string | undefined;
  onTagChange: (id: string | undefined) => void;
  uncategorized: boolean;
  onUncategorizedChange: (value: boolean) => void;
  canClear: boolean;
  onClear: () => void;
};

export type BulkPickerView = {
  picker: 'category' | 'tag' | null;
  count: number;
  expenseCategories: CategoryOption[];
  incomeCategories: CategoryOption[];
  categoryId: string | null;
  onCategoryChange: (id: string) => void;
  tags: { id: string; name: string }[];
  tagId: string | null;
  onTagChange: (id: string) => void;
  pending: boolean;
  onApply: () => void;
  onClose: () => void;
};

export type ConfirmView = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export type RuleQuestionView = {
  message: string;
  creating: boolean;
  error?: string;
  onCreate: () => void;
  onDismiss: () => void;
};

export type TransactionListViewProps = {
  monthLabel: string;
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  actionError: { message: string; onClose: () => void } | null;
  controls: ListControlsView;
  /** Totals and the "N para revisar" strip; null until they load. */
  totals: MonthTotalsView | null;
  reviewCount: number;
  onReview: () => void;
  ruleQuestion: RuleQuestionView | null;
  /** The list view. */
  days: TransactionDayView[];
  emptyReason: 'month' | 'filtered' | null;
  onClearFilters: () => void;
  onConnectAccounts: () => void;
  onNewTransaction: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  /** Callback ref of the element at the end of the list; reaching it loads the next page. */
  watchEnd: (node: HTMLDivElement | null) => void;
  /** The "por categoria" view; null in the list view or while it loads. */
  byCategory: ByCategoryView | null;
  byCategoryStatus: 'loading' | 'error' | 'ready';
  byCategoryEmpty: boolean;
  selectionActive: boolean;
  selectedIds: ReadonlySet<string>;
  onSelectionAction: (action: SelectionAction) => void;
  onSelectionClose: () => void;
  editor: TransactionEditorView | null;
  splitter: TransactionSplitterView | null;
  rowHandlers: TransactionRowHandlers;
  filters: FiltersView;
  bulkPicker: BulkPickerView;
  confirm: ConfirmView | null;
};
