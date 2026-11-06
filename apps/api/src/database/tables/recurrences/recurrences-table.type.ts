export interface RecurrencesTable {
  id: string;
  kind: 'income' | 'expense';
  name: string;
  expected_amount_cents: number;
  amount_mode: 'fixed' | 'last_received';
  counterparty: string | null;
  match_text: string | null;
  account_id: string | null;
  method: 'credit' | 'debit' | 'pix' | 'cash' | 'boleto' | 'transfer' | 'other' | null;
  category_id: string | null;
  date_rule: 'fixed_day' | 'business_day' | 'around_day' | 'any_day';
  day: number | null;
  business_day_number: number | null;
  tolerance_days: number | null;
  non_business_day_shift: 'none' | 'before' | 'after' | null;
  employment_regime: 'clt' | 'pj' | 'other' | null;
  is_subscription: number;
  service_slug: string | null;
  max_payments: number;
  starts_month: string;
  paused_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
