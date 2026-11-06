export interface InvoicesTable {
  id: string;
  account_id: string;
  month: string;
  closes_on: string;
  due_on: string;
  bank_total_cents: number | null;
  total_override_cents: number | null;
  override_note: string | null;
  created_at: string;
  updated_at: string;
}
