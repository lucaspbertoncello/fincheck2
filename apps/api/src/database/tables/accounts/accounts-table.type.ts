export interface AccountsTable {
  id: string;
  type: 'checking' | 'savings' | 'wallet' | 'credit_card';
  source: 'pluggy' | 'manual';
  name: string;
  institution_code: string;
  institution_name: string | null;
  bank_balance_cents: number | null;
  bank_balance_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
