export interface TransactionsTable {
  id: string;
  account_id: string;
  origin: 'bank' | 'manual';
  nature:
    | 'expense'
    | 'income'
    | 'transfer'
    | 'invoice_payment'
    | 'balance_adjustment'
    | 'lent'
    | 'reimbursed';
  nature_set_by: 'system' | 'user';
  method: 'credit' | 'debit' | 'pix' | 'cash' | 'boleto' | 'transfer' | 'other';
  description: string;
  amount_cents: number;
  occurred_on: string;
  invoice_month: string | null;
  bank_description: string | null;
  bank_amount_cents: number | null;
  bank_occurred_on: string | null;
  bank_counterparty: string | null;
  bank_status: 'pending' | 'posted' | null;
  bank_change_json: string | null;
  bank_changed_at: string | null;
  bank_removed_at: string | null;
  ignored_at: string | null;
  category_id: string | null;
  category_source: 'user' | 'rule' | 'recurrence' | 'bill' | null;
  category_rule_id: string | null;
  search_text: string;
  edit_note: string | null;
  installment_plan_id: string | null;
  installment_number: number | null;
  transfer_counterpart_id: string | null;
  created_at: string;
  updated_at: string;
}
