export type InstallmentCreateField =
  'total' | 'description' | 'count' | 'account' | 'date' | 'firstInvoice';

/** What the amount field holds: the whole purchase, or the value of each installment. */
export type InstallmentAmountMode = 'total' | 'installment';

export type InstallmentCreateValues = {
  /** The number typed in the amount field; `amountMode` says what it is. */
  amountCents: number;
  amountMode: InstallmentAmountMode;
  description: string;
  categoryId: string | null;
  /** Text of the field, so it can be empty while typing. */
  countText: string;
  accountId: string | null;
  /** Purchase date, `YYYY-MM-DD`. */
  purchaseOn: string;
  firstInvoiceMonth: string | null;
};

export type InstallmentCreateErrors = Partial<Record<InstallmentCreateField, string>>;

export type InstallmentPreviewRow = {
  number: number;
  monthLabel: string;
  cents: number;
};

/** The installments of a purchase, ready to show: the headline, the last month and every row. */
export type InstallmentPreview = {
  count: number;
  totalCents: number;
  /** Value of the first installment (it takes the leftover cents) and of the others. */
  firstCents: number;
  restCents: number;
  firstMonthLabel: string;
  lastMonthLabel: string;
  rows: InstallmentPreviewRow[];
};
