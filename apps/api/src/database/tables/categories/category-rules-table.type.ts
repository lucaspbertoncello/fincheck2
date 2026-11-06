export interface CategoryRulesTable {
  id: string;
  description_contains: string | null;
  counterparty_contains: string | null;
  kind: 'expense' | 'income' | null;
  account_id: string | null;
  amount_min_cents: number | null;
  amount_max_cents: number | null;
  category_id: string | null;
  enabled: 0 | 1;
  created_at: string;
  updated_at: string;
}
