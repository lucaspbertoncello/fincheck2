/** A transaction that could be the payment of the occurrence. */
export type LinkCandidateData = {
  transactionId: string;
  description: string;
  /** "07/10". */
  dateLabel: string;
  /** Sender or recipient plus the account, when known. */
  detail?: string;
  /** Integer cents, without sign. */
  amountCents: number;
  flow: 'income' | 'expense';
};
