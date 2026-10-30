export const TRANSACTION_ORIGINS = ['bank', 'manual'] as const;

// Only `expense` and `income` count in the month (BR-TRX-006); the other five are "outside the account".
export const TRANSACTION_NATURES = [
  'expense',
  'income',
  'transfer',
  'invoice_payment',
  'balance_adjustment',
  'lent',
  'reimbursed',
] as const;

export const TRANSACTION_METHODS = [
  'credit',
  'debit',
  'pix',
  'cash',
  'boleto',
  'transfer',
  'other',
] as const;

export const TRANSACTION_CATEGORY_SOURCES = ['user', 'rule', 'recurrence', 'bill'] as const;

export const TRANSACTION_SPLIT_LIMITS = { min: 2, max: 10 } as const;
