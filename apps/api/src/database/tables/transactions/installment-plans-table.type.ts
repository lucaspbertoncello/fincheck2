export interface InstallmentPlansTable {
  id: string;
  account_id: string;
  origin: 'bank' | 'manual';
  description: string;
  purchase_on: string;
  total_cents: number;
  installment_count: number;
  first_invoice_month: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}
