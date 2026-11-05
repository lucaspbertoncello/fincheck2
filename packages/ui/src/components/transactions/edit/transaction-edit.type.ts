/**
 * What a transaction is for the accounts. "out_of_account" (invoice payment, transfer marked by
 * mistake) is only an option while the transaction already has it, so it can go back to an
 * expense or income (screens.md, R6).
 */
export type TransactionNature = 'expense' | 'income' | 'transfer' | 'out_of_account';

export type TransactionEditValues = {
  description: string;
  /** Integer cents, positive: the nature gives the direction. */
  amountCents: number;
  /** Business date, `YYYY-MM-DD`. */
  date: string;
  categoryId: string | null;
  /** Tag names without the "#". */
  tags: string[];
  nature: TransactionNature;
  /** The other leg of a transfer. */
  counterpartId: string | null;
};

export type TransactionEditField = 'description' | 'amount' | 'date' | 'category' | 'counterpart';

/** Error message per field, shown right under it. */
export type TransactionEditErrors = Partial<Record<TransactionEditField, string>>;

/** The bank's version of an edited transaction, kept to "Restaurar original" (BR-TRX-004). */
export type OriginalFromBank = {
  description: string;
  amountCents: number;
};
