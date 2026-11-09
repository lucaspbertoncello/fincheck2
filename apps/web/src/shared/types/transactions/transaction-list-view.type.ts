import type {
  AmountKind,
  CategoryGroupData,
  CategoryOption,
  ChoiceOption,
  OriginalFromBank,
  SelectionAction,
  SplitPart,
  SummaryBarSegment,
  TagPickerProps,
  TransactionEditErrors,
  TransactionEditValues,
  TransactionMenuKey,
  TransactionRowData,
} from '@fincheck/ui';

import type { SplitCheck } from '#/domain/transactions/transaction-split/rules/check-split.rule.ts';

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
  /** False for a transaction on a card that is not income: "Receita" is not offered as the type. */
  canBeIncome: boolean;
  /** The categories that are a transfer, offered next to the other leg when the transaction has one. */
  transferCategories: CategoryOption[];
  counterparts: ChoiceOption[];
  /** The tag picker of the category of the transaction. */
  tagPicker: Omit<TagPickerProps, 'label' | 'className'>;
  errors: TransactionEditErrors;
  /** One line under the title: where the transaction is from. */
  description: string;
  /** The sign of the amount, which a transfer keeps whichever way it goes. */
  direction: AmountKind;
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
  /** Whether the transaction being split is money in or out; paints the total. */
  kind: 'income' | 'expense';
  parts: SplitPart[];
  /** The parts checked against the total: validity, difference and empty parts. */
  check: SplitCheck;
  onAmountChange: (index: number, amountCents: number) => void;
  onCategoryChange: (index: number, categoryId: string | null) => void;
  onEvenSplit: () => void;
  categories: CategoryOption[];
  createPartId: () => string;
  description: string;
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
  /** Filters of the "Filtros" panel that are on,. */
  activeFilterCount: number;
  onOpenFilters: () => void;
  selectionActive: boolean;
  selectionCount: number;
  onToggleSelection: () => void;
};

export type MonthTotalsView = {
  /** The accessible name of the block: "Totais do mês", "Totais do período". */
  label: string;
  expensesCents: number;
  incomesCents: number;
  /** Null where the source has no such total (a wider period has only expenses and incomes). */
  outsideCents: number | null;
};

/** The days of one month, under its heading (a wider period shows the list in months). */
export type TransactionMonthView = {
  key: string;
  label: string;
  /** "42 transações". */
  countLabel: string;
  days: TransactionDayView[];
};

export type ByCategoryView = {
  expenseCard: {
    spentCents: number;
    /** Null over all the history: nothing before it to compare with. */
    comparison: {
      previousSamePointCents: number;
      /** Ready bar stretches of the card. */
      barSegments: SummaryBarSegment[];
      /** Against the previous period; null when it had nothing to compare. */
      variationPercent: number | null;
      /** "setembro", "os 12 meses antes", "2025". */
      previousLabel: string;
    } | null;
  };
  incomeCard: {
    receivedCents: number;
    /** Null out of the month: a period has no expected income. */
    expectedCents: number | null;
    /** Received over expected, in whole percent; only read when there is an expected income. */
    percent: number;
    barSegments: SummaryBarSegment[];
    /** The legend under the bar when there is no expected income. */
    receivedLegend: string;
    sourceCount: number;
  };
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
  /**
   * The categories that fit every selected transaction, most used first: one kind, or two groups
   * when all of them are credits on a card. Empty when none fits (expenses and incomes mixed).
   */
  categories: CategoryOption[];
  /**
   * Why `categories` is empty: "mixed" (expenses and incomes: no category fits all) or "none-takes"
   * (none of the selected takes a category: split, transfers, invoice payments). Null with options.
   */
  noCategoryReason: 'mixed' | 'none-takes' | null;
  categoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  tags: { id: string; name: string }[];
  tagId: string | null;
  onTagChange: (id: string) => void;
  pending: boolean;
  onApply: () => void;
  onClose: () => void;
};

/** A bank whose last sync failed: the banner over the list and its "Tentar agora". */
export type SyncFailureView = {
  connectionId: string;
  institution: string;
  detail: string;
  retrying: boolean;
  onRetry: () => void;
};

/** The day the list is narrowed to (`?day=`), with the way back to the whole month. */
export type DayFilterView = {
  /** "Dia 12/10". */
  label: string;
  onClear: () => void;
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

type RuleQuestionView = {
  message: string;
  creating: boolean;
  error?: string;
  onCreate: () => void;
  onDismiss: () => void;
};

export type TransactionListViewProps = {
  /** The title of the empty screen: "Nenhuma transação em outubro 2026 ainda". */
  emptyTitle: string;
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
  /** Out of the month, the same days under their month; null in the month. */
  months: TransactionMonthView[] | null;
  /** 'month': nothing in the month or period; 'day': nothing on the day of `?day=`. */
  emptyReason: 'month' | 'filtered' | 'day' | null;
  /** Set while `?day=` narrows the list to one day. */
  dayFilter: DayFilterView | null;
  syncFailures: SyncFailureView[];
  onClearFilters: () => void;
  onConnectAccounts: () => void;
  onNewTransaction: () => void;
  hasMore: boolean;
  /** The next page of a period is on its way. */
  loadingMore: boolean;
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
