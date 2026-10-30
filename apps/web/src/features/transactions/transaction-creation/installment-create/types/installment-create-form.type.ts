export type InstallmentCreateField =
  'total' | 'description' | 'count' | 'account' | 'date' | 'firstInvoice';

export type InstallmentCreateValues = {
  totalCents: number;
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
