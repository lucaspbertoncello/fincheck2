/** One line of the invoice: a purchase, an installment, a refund or an expected recurrence. */
export type InvoiceDetailItem = {
  key: string;
  title: string;
  /** "21/10 · Parcela 3 de 10" or "Esperada · Netflix". */
  meta: string;
  /** With the sign of the transaction: a purchase is negative. */
  cents: number;
  expected: boolean;
};

export type InvoiceDetailLine = {
  key: string;
  label: string;
  cents: number;
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

/** Everything the invoice modal draws. */
export type InvoiceDetailData = {
  title: string;
  cardName: string;
  statusLabel: string;
  statusTone: 'accent' | 'neutral' | 'ok' | 'warn';
  totalCents: number;
  dueLine: string;
  breakdown: readonly InvoiceDetailLine[];
  /** The bank total or the person's correction, when there is one ("Total do banco"). */
  references: readonly InvoiceDetailLine[];
  payments: readonly { id: string; label: string; cents: number }[];
  suggestion: InvoiceSuggestionData | null;
  items: readonly InvoiceDetailItem[];
  remainingCents: number;
  canRegisterPayment: boolean;
};
