export interface TransactionSplitsTable {
  id: string;
  transaction_id: string;
  position: number;
  amount_cents: number;
  nature: 'expense' | 'income' | 'lent' | 'reimbursed';
  category_id: string | null;
  description: string | null;
}
