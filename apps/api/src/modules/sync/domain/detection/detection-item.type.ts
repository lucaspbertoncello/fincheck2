// A transaction as the detectors of nature of the import see it: what it is and whether anything
// may be changed on it. `isNew` marks the ones the round just brought; the others are older ones the
// detectors may pair a new one with (a debit of yesterday, the credit of today).
export type DetectionItem = {
  id: string;
  accountId: string;
  isCard: boolean;
  // With sign.
  amountCents: number;
  occurredOn: string;
  // The description the bank sent.
  description: string;
  nature:
    | 'expense'
    | 'income'
    | 'transfer'
    | 'invoice_payment'
    | 'balance_adjustment'
    | 'lent'
    | 'reimbursed';
  natureSetBy: 'system' | 'user';
  hasUserCategory: boolean;
  isSplit: boolean;
  isLinked: boolean;
  isNew: boolean;
};
