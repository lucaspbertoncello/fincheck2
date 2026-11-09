import type { BankThemeKey, IconName, ServiceLogoData } from '@fincheck/ui';

export type InvoiceTone = 'accent' | 'neutral' | 'ok' | 'warn';

export type InvoiceSortKey = 'date' | 'amount';

/** The card drawn at the top of the page: the same face as on Contas e cartões. */
export type InvoiceCardData = {
  theme: BankThemeKey;
  nickname: string;
  last4: string;
  dueLabel: string;
  bankName?: string;
  /** Its view-transition name, shared with the card on the list. */
  transitionName: string;
};

/** The payment the app found and offers to link. */
export type InvoiceSuggestionData = {
  transactionId: string;
  description: string;
  /** "R$ 1.284,90 em 21/10". */
  detail: string;
  /** The invoice already counts it as paid (the money left the bank). */
  isPresumed: boolean;
  amountCents: number;
  occurredOn: string;
};

/** The top of the page: the total, when it is due, the state and how it compares to the last one. */
export type InvoiceSummaryData = {
  statusLabel: string;
  statusTone: InvoiceTone;
  totalCents: number;
  /** "vence em 15 dias", "venceu há 3 dias", "paga em 21/10". */
  dueIn: string;
  /** "Fecha 30/10, vence 06/11". */
  dueLine: string;
  /** From 0 to 1; absent on a paid or projected invoice. */
  cycleProgress: number | undefined;
  /** Percent against the invoice before; null when there is nothing to compare. */
  variation: { percent: number; reference: string } | null;
  remainingCents: number;
  canRegisterPayment: boolean;
  canCorrect: boolean;
};

/** One line of "Para onde foi": a category with its share, and whether it filters the list now. */
export type InvoiceCategoryRowData = {
  /** The category id, `none` for what has no category, or `lent` for what was lent. */
  key: string;
  /** What was lent to a friend: its own line, with no category, that does not filter the list. */
  isLent: boolean;
  name: string;
  icon: IconName;
  totalCents: number;
  /** 0 to 100, for the width of the bar. */
  share: number;
  /** "28%". */
  shareLabel: string;
  /** "6 lançamentos". */
  countLabel: string;
  selected: boolean;
};

export type InvoiceHighlightsData = {
  largest: { title: string; cents: number } | null;
  ending: readonly { key: string; title: string; cents: number; partLabel: string }[];
  /** "Dezembro já começa com"; the value goes beside it. */
  nextLabel: string;
  nextCents: number;
};

/** What goes at the left of a line. The only place that decides it: the category icon or a service logo. */
export type InvoiceItemMarkData =
  | {
      kind: 'category';
      icon: IconName;
      /** Drawn with the type badge (red for a purchase, green for a refund). */
      type: 'income' | 'expense';
      uncategorized: boolean;
    }
  | {
      /** A recognized subscription service (BR-REC-017): its logo in the circle. */
      kind: 'subscription';
      service: ServiceLogoData;
    };

export type InvoiceItemBadgeData = {
  /** "3/10". */
  label: string;
  /** Said in full to the screen reader and on hover ("Parcela 3 de 10"). */
  description: string;
  tone: 'neutral' | 'accent' | 'ok';
};

export type InvoiceItemRowData = {
  key: string;
  title: string;
  /** "Mercado" or "22/10 · Mercado" when the list is not grouped by day. */
  detail: string;
  /** With the sign of the transaction: a purchase is negative. */
  cents: number;
  expected: boolean;
  mark: InvoiceItemMarkData;
  badges: readonly InvoiceItemBadgeData[];
};

export type InvoiceItemGroupData = {
  key: string;
  title: string;
  dateLabel: string;
  count: number;
  totalCents: number;
  rows: readonly InvoiceItemRowData[];
};

/** One payment of the invoice, with the texts of its "Desfazer". */
export type InvoicePaymentData = {
  id: string;
  /** "Pago em 21/10". */
  label: string;
  cents: number;
  /** Said only to the screen reader after "Desfazer": "pagamento de 21/10". */
  undoContext: string;
  /** The sentence of the confirmation: the amount, the date and what changes. */
  undoDescription: string;
};

/** The confirmation that opens when "Desfazer" is pressed on a payment. */
type InvoicePaymentUndoData = {
  /** The payment waiting for the answer; null while the dialog is closed. */
  target: InvoicePaymentData | null;
  isBusy: boolean;
  onAsk: (paymentId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

type InvoicePaymentFormData = {
  registering: boolean;
  isBusy: boolean;
  cents: number;
  onCentsChange: (cents: number) => void;
  paidOn: string;
  onPaidOnChange: (value: string) => void;
  today: string;
  error?: string;
  failedAttempts: number;
  onSave: () => void;
  onCancel: () => void;
};

export type InvoicePageViewProps = {
  status: 'loading' | 'error' | 'not-found' | 'ready';
  onRetry: () => void;
  backHref: string;
  backLabel: string;
  onBack: () => void;
  /** "Fatura de outubro 2026". */
  title: string;
  /** The card at the top; null until the card loads. */
  card: InvoiceCardData | null;
  /** The card: "Roxinho". */
  description: string;
  switcher: {
    hasPrevious: boolean;
    hasNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
  };
  actionError: string | null;
  onDismissActionError: () => void;
  summary: InvoiceSummaryData | null;
  onRegisterPayment: () => void;
  onCorrect: () => void;
  suggestion: InvoiceSuggestionData | null;
  onLinkSuggestion: () => void;
  onDismissSuggestion: () => void;
  payments: readonly InvoicePaymentData[];
  paymentUndo: InvoicePaymentUndoData;
  paymentForm: InvoicePaymentFormData;
  categoryRows: readonly InvoiceCategoryRowData[];
  onToggleCategory: (key: string) => void;
  onClearCategory: () => void;
  highlights: InvoiceHighlightsData | null;
  items: {
    groups: readonly InvoiceItemGroupData[];
    totalCount: number;
    shownCount: number;
    searchText: string;
    onSearchTextChange: (text: string) => void;
    sort: InvoiceSortKey;
    onSortChange: (sort: InvoiceSortKey) => void;
    categoryName: string | null;
    emptyDescription: string;
  };
};
