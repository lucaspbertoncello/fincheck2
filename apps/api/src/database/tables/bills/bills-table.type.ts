export interface BillsTable {
  id: string;
  direction: 'payable' | 'receivable';
  kind: 'general' | 'friend';
  description: string;
  counterparty: string | null;
  amount_cents: number;
  due_on: string | null;
  category_id: string | null;
  origin_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}
